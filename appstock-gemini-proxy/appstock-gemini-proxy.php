<?php

/**
 * Plugin Name: AppStock Gemini Proxy avec traitement d'images
 * Description: Sert de proxy sécurisé entre AppStock et l'API Gemini Pro, avec support d'analyse d'images.
 * Version: 1.3
 * Author: VotreNom
 */
if (!defined('ABSPATH')) {
    exit; // Sécurité : empêche l'accès direct
}

/**
 * Route REST personnalisée
 */
add_action('rest_api_init', function () {
    register_rest_route('appstock/v1', '/product-description', [
        'methods'  => 'POST',
        'callback' => 'appstock_get_product_description',
        'permission_callback' => 'appstock_check_authorization',
        // Autoriser le téléversement de fichiers
        'args' => [
            'image' => [
                'type' => 'file',
                'description' => 'Image du produit à analyser',
                'required' => false,
            ],
        ],
    ]);
});

/**
 * Vérifie l'autorisation via Basic Auth ou API Key
 */
function appstock_check_authorization($request)
{
    // Option 1: Vérification par en-tête x-api-key
    $api_key = $request->get_header('x-api-key');
    $expected_key = 'votre_cle_api_secrete'; // Votre clé API secrète

    if (!empty($api_key) && $api_key === $expected_key) {
        return true;
    }

    // Option 2: Vérification via Basic Auth
    $auth_header = $request->get_header('authorization');
    if ($auth_header && strpos($auth_header, 'Basic ') === 0) {
        $credentials = base64_decode(substr($auth_header, 6));
        list($username, $password) = explode(':', $credentials);

        // Vérifier si l'utilisateur et le mot de passe d'application sont corrects
        if ($username === 'appstock-sync-api' && str_replace(' ', '', $password) === str_replace(' ', '', 'Vv6I EWDr R27G sCaw uEWx e6Z5')) {
            return true;
        }
    }

    return false;
}

/**
 * Fonction de traitement de la requête AppStock
 */
function appstock_get_product_description($request)
{
    // Vérifier si nous avons des paramètres JSON ou form-data
    $is_json = strpos($request->get_header('content-type'), 'application/json') !== false;

    if ($is_json) {
        $params = $request->get_json_params();
    } else {
        $params = $request->get_params();
    }

    // Vérification des paramètres requis
    if (empty($params['product_name'])) {
        return new WP_REST_Response(['error' => 'Missing product_name'], 400);
    }

    // Récupération des paramètres
    $product_name = sanitize_text_field($params['product_name']);

    // Paramètres optionnels pour enrichir la description
    $category = isset($params['category']) ? sanitize_text_field($params['category']) : '';
    $brand = isset($params['brand']) ? sanitize_text_field($params['brand']) : '';
    $specifications = isset($params['specifications']) ? $params['specifications'] : [];
    // Si specifications est une chaîne (cas de form-data), tenter de la décoder
    if (is_string($specifications)) {
        $decoded = json_decode($specifications, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $specifications = $decoded;
        }
    }
    $price = isset($params['price']) ? floatval($params['price']) : 0;

    // Traitement de l'image (soit base64, soit fichier téléversé)
    $image_base64 = '';

    // Option 1: Image base64 directe
    if (isset($params['image_base64'])) {
        $image_base64 = $params['image_base64'];
    }

    // Option 2: Fichier téléversé
    $files = $request->get_file_params();
    if (!empty($files) && isset($files['image']) && $files['image']['error'] === UPLOAD_ERR_OK) {
        $image_path = $files['image']['tmp_name'];
        if (file_exists($image_path)) {
            $image_data = file_get_contents($image_path);
            $image_base64 = base64_encode($image_data);
        }
    }

    // Formatage des spécifications si présentes
    $specs_text = '';
    if (!empty($specifications) && is_array($specifications)) {
        $specs_text = "Voici les spécifications connues du produit :\n";
        foreach ($specifications as $key => $value) {
            $specs_text .= "- " . sanitize_text_field($key) . ": " . sanitize_text_field($value) . "\n";
        }
    }

    // Clé API Gemini 
    $gemini_api_key = 'AIzaSyAdXxQBVnv4sdgTSAM-wM-cy43a3-Zy0eA';

    // Vérifier si la clé API est définie
    if (empty($gemini_api_key)) {
        error_log('Clé API Gemini non définie');
        return new WP_REST_Response(['error' => 'Configuration API manquante'], 500);
    }

    // Déterminer quelle API Gemini utiliser (avec ou sans image)
    if (!empty($image_base64)) {
        // Si une image est fournie, utiliser l'API Vision
        return process_with_image($gemini_api_key, $product_name, $category, $brand, $specifications, $price, $image_base64);
    } else {
        // Sans image, utiliser l'API texte standard
        return process_text_only($gemini_api_key, $product_name, $category, $brand, $specifications, $price, $specs_text);
    }
}

/**
 * Traitement avec l'API Gemini texte uniquement
 */
function process_text_only($gemini_api_key, $product_name, $category, $brand, $specifications, $price, $specs_text)
{
    // Préparation de la requête pour l'API Gemini avec un prompt plus élaboré
    $prompt = "Tu es un expert en rédaction de fiches produit pour un site e-commerce. 
    
Crée une description commerciale complète et détaillée pour le produit suivant : {$product_name}";

    // Ajouter les informations supplémentaires au prompt si disponibles
    if (!empty($category)) {
        $prompt .= "\nCatégorie de produit : {$category}";
    }

    if (!empty($brand)) {
        $prompt .= "\nMarque : {$brand}";
    }

    if (!empty($price) && $price > 0) {
        $prompt .= "\nPrix : {$price} €";
    }

    if (!empty($specs_text)) {
        $prompt .= "\n\n{$specs_text}";
    }

    $prompt .= "\n\nTa réponse doit suivre ce format :
1. Une description générale engageante et persuasive (3-4 paragraphes)
2. Les points forts du produit (liste de 4-6 avantages clés)
3. Une fiche technique détaillée avec les caractéristiques principales, présentée sous forme de tableau HTML avec les balises <table>, <tr>, <th> et <td> pour une intégration facile sur le site
4. Si pertinent, des conseils d'utilisation ou des informations supplémentaires utiles pour le client

Utilise un ton commercial et persuasif. Inclus des détails techniques pertinents. Si tu n'as pas certaines informations, tu peux faire des suppositions raisonnables basées sur les produits similaires de cette catégorie.";

    $request_data = [
        'contents' => [
            [
                'role' => 'user',
                'parts' => [
                    ['text' => $prompt]
                ]
            ]
        ],
        'generationConfig' => [
            'temperature' => 0.7,
            'maxOutputTokens' => 2000,
            'topP' => 0.95,
            'topK' => 40
        ],
        'safetySettings' => [
            [
                'category' => 'HARM_CATEGORY_HARASSMENT',
                'threshold' => 'BLOCK_ONLY_HIGH'
            ],
            [
                'category' => 'HARM_CATEGORY_HATE_SPEECH',
                'threshold' => 'BLOCK_ONLY_HIGH'
            ],
            [
                'category' => 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                'threshold' => 'BLOCK_ONLY_HIGH'
            ],
            [
                'category' => 'HARM_CATEGORY_DANGEROUS_CONTENT',
                'threshold' => 'BLOCK_ONLY_HIGH'
            ]
        ]
    ];

    // Afficher la requête pour débogage
    error_log('Requête à l\'API Gemini: ' . json_encode($request_data, JSON_PRETTY_PRINT));

    $model_name = 'gemini-1.5-flash';
    $gemini_api_url = 'https://generativelanguage.googleapis.com/v1/models/' . $model_name . ':generateContent?key=' . $gemini_api_key;

    return send_gemini_request($gemini_api_url, $request_data, $product_name);
}

/**
 * Traitement avec l'API Gemini vision (avec image)
 */
function process_with_image($gemini_api_key, $product_name, $category, $brand, $specifications, $price, $image_base64)
{
    // Nettoyer l'image base64 si nécessaire (supprimer le préfixe data:image/jpeg;base64, si présent)
    if (strpos($image_base64, 'data:image') !== false) {
        $image_base64 = preg_replace('/^data:image\/\w+;base64,/', '', $image_base64);
    }

    // Préparation du prompt pour l'analyse d'image
    $text_prompt = "Tu es un expert en rédaction de fiches produit pour un site e-commerce. 
    
Analyse l'image de ce produit: {$product_name}";

    // Ajouter les informations supplémentaires au prompt si disponibles
    if (!empty($category)) {
        $text_prompt .= "\nCatégorie de produit : {$category}";
    }

    if (!empty($brand)) {
        $text_prompt .= "\nMarque : {$brand}";
    }

    if (!empty($price) && $price > 0) {
        $text_prompt .= "\nPrix : {$price} €";
    }

    if (!empty($specifications) && is_array($specifications)) {
        $text_prompt .= "\n\nSpécifications connues:";
        foreach ($specifications as $key => $value) {
            $text_prompt .= "\n- " . sanitize_text_field($key) . ": " . sanitize_text_field($value);
        }
    }

    $text_prompt .= "\n\nD'abord, décris ce que tu vois dans l'image de manière détaillée.
Ensuite, crée une fiche produit complète avec:
1. Une description générale engageante et persuasive (3-4 paragraphes)
2. Les points forts du produit (liste de 4-6 avantages clés)
3. Une fiche technique détaillée avec les caractéristiques principales, présentée sous forme de tableau HTML avec les balises <table>, <tr>, <th> et <td>
4. Des conseils d'utilisation si pertinent

Utilise un ton commercial et persuasif. Inclus des détails techniques pertinents. Si tu n'as pas certaines informations, fais des suppositions raisonnables basées sur l'image et la catégorie du produit.";

    $request_data = [
        'contents' => [
            [
                'role' => 'user',
                'parts' => [
                    [
                        'text' => $text_prompt
                    ],
                    [
                        'inline_data' => [
                            'mime_type' => 'image/jpeg',
                            'data' => $image_base64
                        ]
                    ]
                ]
            ]
        ],
        'generationConfig' => [
            'temperature' => 0.7,
            'maxOutputTokens' => 2000,
            'topP' => 0.95,
            'topK' => 40
        ],
        'safetySettings' => [
            [
                'category' => 'HARM_CATEGORY_HARASSMENT',
                'threshold' => 'BLOCK_ONLY_HIGH'
            ],
            [
                'category' => 'HARM_CATEGORY_HATE_SPEECH',
                'threshold' => 'BLOCK_ONLY_HIGH'
            ],
            [
                'category' => 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                'threshold' => 'BLOCK_ONLY_HIGH'
            ],
            [
                'category' => 'HARM_CATEGORY_DANGEROUS_CONTENT',
                'threshold' => 'BLOCK_ONLY_HIGH'
            ]
        ]
    ];

    // Déboguer la requête (sans l'image complète pour éviter des logs trop grands)
    $debug_data = $request_data;
    $debug_data['contents'][0]['parts'][1]['inline_data']['data'] = '[IMAGE_BASE64_TRUNCATED]';
    error_log('Requête à l\'API Gemini Vision: ' . json_encode($debug_data, JSON_PRETTY_PRINT));

    $model_name = 'gemini-1.5-flash';
    $gemini_api_url = 'https://generativelanguage.googleapis.com/v1/models/' . $model_name . ':generateContent?key=' . $gemini_api_key;

    return send_gemini_request($gemini_api_url, $request_data, $product_name);
}

/**
 * Fonction d'envoi de requête à l'API Gemini et traitement de la réponse
 */
function send_gemini_request($gemini_api_url, $request_data, $product_name)
{
    // Appel à l'API Gemini
    $response = wp_remote_post($gemini_api_url, [
        'headers' => [
            'Content-Type' => 'application/json',
        ],
        'body' => json_encode($request_data),
        'timeout' => 30,
    ]);

    // Gestion des erreurs de connexion
    if (is_wp_error($response)) {
        error_log('Erreur Gemini: ' . $response->get_error_message());
        return new WP_REST_Response(['error' => 'Erreur de connexion à Gemini'], 500);
    }

    // Récupérer le code de statut HTTP
    $status_code = wp_remote_retrieve_response_code($response);
    error_log('Code de statut HTTP: ' . $status_code);

    // Récupérer le corps de la réponse
    $body = wp_remote_retrieve_body($response);

    // Si le corps est vide, retourner une erreur
    if (empty($body)) {
        return new WP_REST_Response([
            'error' => 'Réponse vide de Gemini',
            'status_code' => $status_code
        ], 502);
    }

    // Décoder le JSON
    $data = json_decode($body, true);

    // Vérifier si le décodage JSON a réussi
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log('Erreur de décodage JSON: ' . json_last_error_msg());
        return new WP_REST_Response([
            'error' => 'Erreur de décodage JSON: ' . json_last_error_msg(),
            'raw_response' => substr($body, 0, 1000)
        ], 502);
    }

    // Vérifier si la réponse contient une erreur
    if (isset($data['error'])) {
        error_log('Erreur retournée par l\'API Gemini: ' . print_r($data['error'], true));
        return new WP_REST_Response([
            'error' => 'Erreur retournée par l\'API Gemini',
            'details' => $data['error']
        ], 502);
    }

    // Extraction du texte depuis la structure de réponse correcte de Gemini
    $description = '';
    if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
        $description = $data['candidates'][0]['content']['parts'][0]['text'];
    } else {
        error_log('Structure de réponse inattendue: ' . print_r($data, true));
        return new WP_REST_Response([
            'error' => 'Structure de réponse inattendue de Gemini',
            'response' => $data
        ], 502);
    }

    return new WP_REST_Response([
        'product_name' => $product_name,
        'description'  => $description,
    ], 200);
}

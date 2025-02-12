const multer = require('multer');
const path = require('path');
const fs = require('fs');

const formatFileName = (originalName) => {
  return originalName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const entity = req.baseUrl.split('/').pop(); // Récupère l'entité (categories, products, etc.)
    const id = req.params.id; // Récupère l'ID de l'entité

    const allowedEntities = ['categories', 'products', 'brands', 'suppliers'];
    if (!allowedEntities.includes(entity)) {
      return cb(new Error('Invalid entity for upload'), null);
    }

    // 📌 Forcer un chemin absolu depuis la racine du projet
    const projectRoot = path.resolve(__dirname, '../../'); // Remonte de 2 niveaux
    const dir = path.join(projectRoot, 'public', entity, id || 'temp');

    console.log(`📂 Vérification du dossier : ${dir}`);

    if (!fs.existsSync(dir)) {
      console.log(`📂 Création du dossier : ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const formattedName = formatFileName(path.parse(file.originalname).name);
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${formattedName}-${timestamp}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image format (jpeg, jpg, png, gif, webp only)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: fileFilter,
});

module.exports = upload;

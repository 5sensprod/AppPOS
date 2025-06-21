; Script personnalisé pour préserver node_modules lors des updates
!macro preInit
  SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\AppPOS"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\AppPOS"
  SetRegView 32
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\AppPOS"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\AppPOS"
!macroend

; ✅ NOUVEAU : Sauvegarder node_modules avant installation
!macro customInit
  ; Vérifier si c'est une mise à jour
  IfFileExists "C:\AppPOS\resources\AppServe\node_modules" 0 +8
    DetailPrint "Sauvegarde des node_modules existants..."
    CreateDirectory "C:\Temp\AppPOS_Backup"
    CopyFiles /SILENT "C:\AppPOS\resources\AppServe\node_modules" "C:\Temp\AppPOS_Backup\node_modules"
    SetOutPath "C:\Temp\AppPOS_Backup"
    FileOpen $0 "backup_marker.txt" w
    FileWrite $0 "node_modules_saved"
    FileClose $0
!macroend

; ✅ NOUVEAU : Restaurer node_modules après installation
!macro customInstall
  ; Vérifier si on a sauvegardé des node_modules
  IfFileExists "C:\Temp\AppPOS_Backup\backup_marker.txt" 0 +6
    DetailPrint "Restauration des node_modules..."
    CreateDirectory "$INSTDIR\resources\AppServe"
    CopyFiles /SILENT "C:\Temp\AppPOS_Backup\node_modules" "$INSTDIR\resources\AppServe\node_modules"
    RMDir /r "C:\Temp\AppPOS_Backup"
    DetailPrint "Node_modules restaurés avec succès"
!macroend
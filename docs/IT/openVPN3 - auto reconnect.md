---
sidebar_position: 3
sidebar_label: Service de monitoring VPN
---

# Documentation d'implémentation du script de monitoring VPN

## Objectif

Créer un service systemd qui surveille et restaure automatiquement une connexion VPN sur un serveur distant.

## 📋 Prérequis

- Système Linux avec systemd
- OpenVPN 3
- Accès sudo
- Compte Gotify (optionnel)

## 🚀 Étapes d'installation

### 1. Création du script

```bash
sudo nano /usr/local/bin/vpn-monitor.sh
```


```sh
#!/bin/bash

# Configuration
LOG_FILE="/var/log/vpn_monitor_script.log"
GOTIFY_URL="https://gotify.wetter.land"
GOTIFY_TOKEN="votre_token_ici"
VPN_SERVICE="openvpn3-session@wetterland.service"
VPN_PROFILE_NAME="wetterland"  # Nom du profil VPN

# Option de débogage
DEBUG=0

# Fonction de log de débogage
debug_log() {
    if [ "$DEBUG" -eq 1 ]; then
        log_message "[DEBUG] $1"
    fi
}

# Fonction de log
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Fonction d'envoi de notification Gotify
send_gotify_notification() {
    local title="$1"
    local message="$2"
    local priority="${3:-5}"
    
    debug_log "Envoi notification Gotify - Titre: $title, Message: $message, Priorité: $priority"
    
    curl "${GOTIFY_URL}/message?token=${GOTIFY_TOKEN}" \
         -F "title=${title}" \
         -F "message=${message}" \
         -F "priority=${priority}" 2>/dev/null
}

# Fonction de vérification de la connexion VPN
check_vpn_connection() {
    debug_log "Vérification de la connexion VPN"
    
    # Utiliser openvpn3 pour lister les sessions
    local sessions_output
    sessions_output=$(openvpn3 sessions-list 2>&1)
    local sessions_exit_code=$?
    
    debug_log "Sortie de sessions-list: $sessions_output"
    debug_log "Code de sortie: $sessions_exit_code"
    
    # Vérifier si la commande a réussi
    if [ $sessions_exit_code -ne 0 ]; then
        log_message "Erreur lors de la vérification des sessions VPN"
        return 1
    fi
    
    # Rechercher une session active pour le profil spécifique
    if echo "$sessions_output" | grep -q "$VPN_PROFILE_NAME"; then
        debug_log "Session VPN active trouvée pour $VPN_PROFILE_NAME"
        return 0
    else
        debug_log "Aucune session VPN active pour $VPN_PROFILE_NAME"
        return 1
    fi
}

# Fonction de restauration de la connexion VPN
restore_vpn_connection() {
    log_message "Tentative de restauration de la connexion VPN"
    
    # Déconnecter toutes les sessions existantes
    openvpn3 sessions-list | grep Path | while read -r line; do
        session_path=$(echo "$line" | cut -d: -f2 | xargs)
        log_message "Déconnexion de la session : $session_path"
        openvpn3 session-manage --disconnect --path "$session_path"
    done
    
    # Attendre quelques secondes
    sleep 5
    
    # Reconnecter le profil VPN
    log_message "Reconnexion au profil VPN : $VPN_PROFILE_NAME"
    openvpn3 session-start --interface "$VPN_PROFILE_NAME"
    local connect_exit_code=$?
    
    if [ $connect_exit_code -eq 0 ]; then
        log_message "Reconnexion VPN réussie"
        return 0
    else
        log_message "Échec de la reconnexion VPN"
        return 1
    fi
}

# Fonction principale
main() {
    # Chemin du fichier de statut
    STATUS_FILE="/tmp/vpn_status.tmp"
    
    debug_log "Début du script de monitoring VPN"
    log_message "Exécution du script de monitoring VPN"

    # Vérifier la connexion VPN
    if ! check_vpn_connection; then
        log_message "Connexion VPN down"
        
        # Enregistrer le statut down
        echo "down" > "$STATUS_FILE"
        
        # Tenter de restaurer la connexion
        if restore_vpn_connection; then
            # Attendre la stabilisation
            sleep 10
            
            # Vérifier à nouveau la connexion
            if check_vpn_connection; then
                log_message "Connexion VPN restaurée avec succès"
                
                # Enregistrer le statut up
                echo "up" > "$STATUS_FILE"
                
                # Montage des systèmes de fichiers
                log_message "Exécution de mount -a"
                mount -a
                local mount_status=$?
                
                if [ $mount_status -eq 0 ]; then
                    log_message "Montage des systèmes de fichiers réussi"
                    send_gotify_notification "VPN Restauré" "Connexion VPN rétablie et montage des systèmes de fichiers effectués"
                else
                    log_message "ERREUR : Échec du montage des systèmes de fichiers"
                    send_gotify_notification "VPN Montage Erreur" "Échec du montage des systèmes de fichiers après restauration VPN" 6
                    exit 1
                fi
            else
                log_message "ERREUR : Impossible de restaurer la connexion VPN"
                send_gotify_notification "VPN Erreur Critique" "Impossible de restaurer la connexion VPN" 8
                exit 1
            fi
        else
            log_message "ERREUR : Échec de la restauration de la connexion VPN"
            send_gotify_notification "VPN Erreur Restauration" "Impossible de restaurer la connexion VPN" 7
            exit 1
        fi
    else
        # VPN est connecté
        log_message "Connexion VPN active, aucune action requise"
        
        # Enregistrer le statut up
        echo "up" > "$STATUS_FILE"
        
        debug_log "Fin du script - VPN actif"
        exit 0
    fi
}

# Gestion des erreurs
trap 'log_message "Script interrompu"; exit 1' SIGINT SIGTERM ERR

# Exécution du script
main
```
Collez le contenu du script précédent et remplacez :
- `GOTIFY_TOKEN` par votre token
- Ajustez le nom du service VPN si nécessaire

### 2. Rendre le script exécutable

```bash
sudo chmod +x /usr/local/bin/vpn-monitor.sh
```

### 3. Création des fichiers systemd

#### Fichier de service

```bash
sudo nano /etc/systemd/system/vpn-monitor.service
```

```ini
[Unit]
Description=VPN Monitoring Service
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/vpn-monitor.sh
RemainAfterExit=no

[Install]
WantedBy=multi-user.target
Also=vpn-monitor.target
```

### Fichier target

```bash
sudo nano /etc/systemd/system/vpn-monitor.target
```

```ini
[Unit]
Description=VPN Monitoring Target
BindsTo=vpn-monitor.service
After=vpn-monitor.service
```
[Install]
WantedBy=timers.target

#### Fichier timer

```bash
sudo nano /etc/systemd/system/vpn-monitor.timer
```

```ini
[Unit]
Description=VPN Monitoring Timer

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
```

### 4. Activation et démarrage

```bash
# Recharger la configuration systemd
sudo systemctl daemon-reload

# Activer le timer et target
sudo systemctl enable vpn-monitor.timer
sudo systemctl enable vpn-monitor.target

# Démarrer le timer
sudo systemctl start vpn-monitor.timer
```

## 🔍 Vérification

### Statut du timer

```bash
sudo systemctl status vpn-monitor.timer
```

### Logs

```bash
# Logs systemd
journalctl -u vpn-monitor.service

# Logs du script
tail -f /var/log/vpn_monitor_script.log
```

## 🛠 Personnalisation

### Modification de la fréquence

Dans le fichier `.timer`, modifiez `OnCalendar=*:0/5` :
- `*:0/5` : toutes les 5 minutes
- `*:0/10` : toutes les 10 minutes
- `*-*-* 06:00:00` : une fois par jour à 6h

## 🐞 Dépannage

### Problèmes courants

1. **Permissions**
   - Assurez-vous que le script est exécutable
   - Vérifiez les droits d'accès aux fichiers

2. **Notifications Gotify**
   - Vérifiez le token
   - Assurez-vous que l'URL est correcte
   - Testez manuellement avec curl

3. **Service VPN**
   - Vérifiez le nom exact du service
   - Confirmez que le service existe

### Test manuel

```bash
# Exécution manuelle du script
sudo /usr/local/bin/vpn-monitor.sh

# Vérification des erreurs
echo $?
```

## 🔒 Sécurité

- Limitez les permissions du script
- Protégez le fichier de log
- Utilisez des tokens sécurisés pour Gotify

```bash
# Permissions recommandées
sudo chown root:root /usr/local/bin/vpn-monitor.sh
sudo chmod 750 /usr/local/bin/vpn-monitor.sh
```

## 🔧 Maintenance

- Mettez à jour régulièrement le script
- Surveillez les logs
- Ajustez la configuration selon vos besoins

## 📦 Annexes

### Variables configurables

- `LOG_FILE` : Chemin du fichier de log
- `GOTIFY_URL` : URL du serveur Gotify
- `GOTIFY_TOKEN` : Token d'authentification
- `VPN_SERVICE` : Nom du service VPN

## 💡 Conseils avancés

- Considérez une redondance VPN
- Mettez en place des alertes sur plusieurs canaux
- Automatisez les mises à jour du script

## 📝 Exemple de script complet

```bash
#!/bin/bash

# Configuration
LOG_FILE="/var/log/vpn_monitor_script.log"
GOTIFY_URL="https://gotify.example.com/message"
GOTIFY_TOKEN="your_token_here"
VPN_SERVICE="openvpn3-session@example.service"

# Reste du script (comme dans l'exemple précédent)
...
```

---

**Note**: Cette documentation est un guide générique. Adaptez-la à votre environnement spécifique.
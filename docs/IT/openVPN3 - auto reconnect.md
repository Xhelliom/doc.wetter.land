---
sidebar_position: 3
sidebar_label: 🔐 Service de monitoring VPN automatique
---

# 🔐 Service de monitoring VPN avec reconnexion automatique

Guide complet pour créer un service systemd qui surveille et restaure automatiquement une connexion OpenVPN3 sur un serveur distant.

## 🎯 Objectif

Mettre en place un système de **surveillance automatique** qui :
- 🔍 **Vérifie** la connexion VPN toutes les 5 minutes
- 🔄 **Reconnecte automatiquement** en cas de déconnexion
- 📱 **Envoie des notifications** via Gotify
- 🗂️ **Monte les systèmes de fichiers** après reconnexion

## 📋 Prérequis

:::note Prérequis système

- **Système Linux** avec systemd
- **OpenVPN 3** installé et configuré
- **Accès sudo** pour l'installation
- **Compte Gotify** (optionnel pour les notifications)

:::

## 🛠️ Installation étape par étape

### 1. Création du script de monitoring

```bash title="Création du script principal"
sudo nano /usr/local/bin/vpn-monitor.sh
```

### 2. Contenu du script complet

```bash title="/usr/local/bin/vpn-monitor.sh"
#!/bin/bash

# ====================================================================
# Script de monitoring et restauration automatique VPN OpenVPN3
# ====================================================================

# Configuration
LOG_FILE="/var/log/vpn_monitor_script.log"
GOTIFY_URL="https://gotify.wetter.land"
GOTIFY_TOKEN="VOTRE_TOKEN_ICI"
VPN_SERVICE="openvpn3-session@wetterland.service"
VPN_PROFILE_NAME="wetterland"

# Option de débogage
DEBUG=0

# ====================================================================
# FONCTIONS UTILITAIRES
# ====================================================================

# Fonction de log de débogage
debug_log() {
    if [ "$DEBUG" -eq 1 ]; then
        log_message "[DEBUG] $1"
    fi
}

# Fonction de log principal
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Fonction d'envoi de notification Gotify
send_gotify_notification() {
    local title="$1"
    local message="$2"
    local priority="${3:-5}"
    
    debug_log "Envoi notification - Titre: $title, Message: $message"
    
    curl -s "${GOTIFY_URL}/message?token=${GOTIFY_TOKEN}" \
         -F "title=${title}" \
         -F "message=${message}" \
         -F "priority=${priority}" 2>/dev/null
}

# ====================================================================
# FONCTIONS VPN
# ====================================================================

# Vérification de la connexion VPN
check_vpn_connection() {
    debug_log "Vérification de la connexion VPN"
    
    local sessions_output
    sessions_output=$(openvpn3 sessions-list 2>&1)
    local exit_code=$?
    
    debug_log "Sortie sessions-list: $sessions_output"
    debug_log "Code de sortie: $exit_code"
    
    # Vérifier si la commande a réussi
    if [ $exit_code -ne 0 ]; then
        log_message "❌ Erreur lors de la vérification des sessions VPN"
        return 1
    fi
    
    # Rechercher une session active pour le profil
    if echo "$sessions_output" | grep -q "$VPN_PROFILE_NAME"; then
        debug_log "✅ Session VPN active trouvée pour $VPN_PROFILE_NAME"
        return 0
    else
        debug_log "❌ Aucune session VPN active pour $VPN_PROFILE_NAME"
        return 1
    fi
}

# Fonction de restauration de la connexion VPN
restore_vpn_connection() {
    log_message "🔄 Tentative de restauration de la connexion VPN"
    
    # Étape 1: Déconnecter toutes les sessions existantes
    log_message "🔌 Déconnexion des sessions existantes"
    openvpn3 sessions-list | grep Path | while read -r line; do
        session_path=$(echo "$line" | cut -d: -f2 | xargs)
        log_message "  Déconnexion: $session_path"
        openvpn3 session-manage --disconnect --path "$session_path"
    done
    
    # Attendre la déconnexion complète
    sleep 5
    
    # Étape 2: Reconnecter le profil VPN
    log_message "🔌 Reconnexion au profil: $VPN_PROFILE_NAME"
    openvpn3 session-start --interface "$VPN_PROFILE_NAME"
    local connect_exit_code=$?
    
    # Étape 3: Si échec, tenter le redémarrage du service systemd
    if [ $connect_exit_code -ne 0 ]; then
        log_message "⚠️ Échec reconnexion directe, redémarrage du service systemd"
        
        systemctl restart "$VPN_SERVICE"
        local systemd_restart_code=$?
        
        if [ $systemd_restart_code -eq 0 ]; then
            # Attendre la stabilisation
            sleep 10
            
            # Vérifier à nouveau la connexion
            if check_vpn_connection; then
                log_message "✅ Connexion VPN restaurée via service systemd"
                return 0
            else
                log_message "❌ Échec de restauration via service systemd"
                return 1
            fi
        else
            log_message "❌ Échec du redémarrage du service systemd"
            return 1
        fi
    fi
    
    return 0
}

# ====================================================================
# FONCTION PRINCIPALE
# ====================================================================

main() {
    STATUS_FILE="/tmp/vpn_status.tmp"
    
    debug_log "🚀 Début du script de monitoring VPN"
    log_message "📊 Exécution du monitoring VPN"

    # Vérifier la connexion VPN
    if ! check_vpn_connection; then
        log_message "⚠️ Connexion VPN détectée comme DOWN"
        
        # Enregistrer le statut down
        echo "down" > "$STATUS_FILE"
        
        # Tenter de restaurer la connexion
        if restore_vpn_connection; then
            # Attendre la stabilisation
            sleep 10
            
            # Vérifier à nouveau la connexion
            if check_vpn_connection; then
                log_message "✅ Connexion VPN restaurée avec succès"
                
                # Enregistrer le statut up
                echo "up" > "$STATUS_FILE"
                
                # Montage des systèmes de fichiers
                log_message "🗂️ Exécution de mount -a"
                mount -a
                local mount_status=$?
                
                if [ $mount_status -eq 0 ]; then
                    log_message "✅ Montage des systèmes de fichiers réussi"
                    send_gotify_notification "🔐 VPN Restauré" "Connexion VPN rétablie et systèmes de fichiers montés" 5
                else
                    log_message "❌ ERREUR: Échec du montage des systèmes de fichiers"
                    send_gotify_notification "⚠️ VPN Montage Erreur" "Échec montage après restauration VPN" 6
                    exit 1
                fi
            else
                log_message "❌ ERREUR: Impossible de restaurer la connexion VPN"
                send_gotify_notification "🚨 VPN Erreur Critique" "Impossible de restaurer la connexion VPN" 8
                exit 1
            fi
        else
            log_message "❌ ERREUR: Échec de la restauration de la connexion VPN"
            send_gotify_notification "⚠️ VPN Erreur Restauration" "Impossible de restaurer la connexion VPN" 7
            exit 1
        fi
    else
        # VPN est connecté
        log_message "✅ Connexion VPN active, aucune action requise"
        
        # Enregistrer le statut up
        echo "up" > "$STATUS_FILE"
        
        debug_log "🏁 Fin du script - VPN actif"
        exit 0
    fi
}

# ====================================================================
# GESTION DES ERREURS ET EXÉCUTION
# ====================================================================

# Gestion des erreurs
trap 'log_message "⚠️ Script interrompu"; exit 1' SIGINT SIGTERM ERR

# Exécution du script principal
main
```

:::warning Configuration obligatoire

Remplacez `VOTRE_TOKEN_ICI` par votre véritable token Gotify et ajustez les autres variables selon votre configuration.

:::

### 3. Permissions du script

```bash title="Rendre le script exécutable"
sudo chmod +x /usr/local/bin/vpn-monitor.sh
```

## ⚙️ Configuration systemd

### 1. Service principal

```bash title="Création du fichier service"
sudo nano /etc/systemd/system/vpn-monitor.service
```

```ini title="/etc/systemd/system/vpn-monitor.service"
[Unit]
Description=🔐 Service de monitoring VPN
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/vpn-monitor.sh
RemainAfterExit=no
User=root

[Install]
WantedBy=multi-user.target
```

### 2. Timer automatique

```bash title="Création du timer"
sudo nano /etc/systemd/system/vpn-monitor.timer
```

```ini title="/etc/systemd/system/vpn-monitor.timer"
[Unit]
Description=⏰ Timer de monitoring VPN
Requires=vpn-monitor.service

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
```

:::info Fréquence de vérification

`OnCalendar=*:0/5` = toutes les 5 minutes. Modifiez selon vos besoins :
- `*:0/2` : toutes les 2 minutes
- `*:0/10` : toutes les 10 minutes

:::

## 🚀 Activation du service

### Commandes d'activation

```bash title="Activation complète du monitoring"
# Recharger la configuration systemd
sudo systemctl daemon-reload

# Activer les services
sudo systemctl enable vpn-monitor.timer
sudo systemctl enable vpn-monitor.service

# Démarrer le timer
sudo systemctl start vpn-monitor.timer
```

## 📊 Vérification et monitoring

### Vérifier le statut

```bash title="Statut du timer"
sudo systemctl status vpn-monitor.timer
```

```bash title="Statut du service"
sudo systemctl status vpn-monitor.service
```

### Consultation des logs

```bash title="Logs systemd"
sudo journalctl -u vpn-monitor.service -f
```

```bash title="Logs du script"
sudo tail -f /var/log/vpn_monitor_script.log
```

### Test manuel

```bash title="Exécution manuelle pour test"
sudo /usr/local/bin/vpn-monitor.sh
```

## 🔧 Personnalisation

### Modification des notifications

Dans le script, vous pouvez personnaliser :

```bash title="Exemple de personnalisation des notifications"
# Changer les priorités Gotify
send_gotify_notification "Titre" "Message" 10  # Priorité haute

# Ajouter d'autres canaux (email, Slack, etc.)
send_email_notification() {
    # Votre code d'envoi email
}
```

### Variables configurables

| Variable | Description | Exemple |
|----------|-------------|---------|
| `LOG_FILE` | Fichier de logs | `/var/log/vpn_monitor.log` |
| `GOTIFY_URL` | URL du serveur Gotify | `https://gotify.example.com` |
| `VPN_PROFILE_NAME` | Nom du profil VPN | `mycompany-vpn` |
| `DEBUG` | Mode débogage | `1` (activé) ou `0` (désactivé) |

## 🛠️ Dépannage

### Problèmes courants

<details>
<summary>Le script ne fonctionne pas</summary>

**Vérifications :**
1. Permissions du script : `ls -la /usr/local/bin/vpn-monitor.sh`
2. Configuration OpenVPN3 : `openvpn3 sessions-list`
3. Logs d'erreur : `journalctl -u vpn-monitor.service`
</details>

<details>
<summary>Notifications Gotify non reçues</summary>

**Solutions :**
1. Vérifiez le token Gotify
2. Testez manuellement :
```bash
curl "https://gotify.example.com/message?token=TOKEN" \
     -F "title=Test" \
     -F "message=Message de test"
```
</details>

<details>
<summary>VPN ne se reconnecte pas</summary>

**Vérifications :**
1. Nom du profil VPN correct
2. Service systemd existant
3. Permissions pour redémarrer les services
</details>

## 🔒 Sécurité

### Permissions recommandées

```bash title="Sécurisation du script"
# Propriétaire root uniquement
sudo chown root:root /usr/local/bin/vpn-monitor.sh
sudo chmod 750 /usr/local/bin/vpn-monitor.sh

# Protection du fichier de log
sudo chown root:root /var/log/vpn_monitor_script.log
sudo chmod 640 /var/log/vpn_monitor_script.log
```

:::warning Token de sécurité

- Stockez le token Gotify de manière sécurisée
- Limitez les permissions du script
- Surveillez régulièrement les logs

:::

## 📈 Améliorations possibles

### Fonctionnalités avancées

1. **Alertes multiples** : Email + Gotify + Slack
2. **Métriques** : Collecte de statistiques de disponibilité
3. **Fallback VPN** : Basculement vers un VPN de secours
4. **Interface web** : Dashboard de monitoring

### Exemple d'extension

```bash title="Ajout de métriques"
# Dans le script principal
METRICS_FILE="/var/log/vpn_metrics.log"

log_metric() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'),$1,$2" >> "$METRICS_FILE"
}

# Utilisation
log_metric "connection_check" "success"
log_metric "reconnection" "success"
```

## 🎯 Résultat final

Une fois configuré, votre système :

- ✅ **Surveille automatiquement** votre connexion VPN
- ✅ **Reconnecte automatiquement** en cas de panne
- ✅ **Envoie des notifications** en temps réel
- ✅ **Monte les systèmes de fichiers** après reconnexion
- ✅ **Log tout** pour le débogage

:::tip Conseil pro

Combinez ce script avec un monitoring externe (comme Uptime Kuma) pour une surveillance complète de votre infrastructure.

:::
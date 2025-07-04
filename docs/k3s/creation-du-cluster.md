---
sidebar_position: 2
sidebar_label: 🏗️ Création du cluster K3s (AMD et ARM)
---

# 🏗️ Création d'un cluster K3s multi-architecture

Guide complet pour créer un cluster K3s fonctionnel sur architectures AMD64 et ARM64.

## 🖥️ Distribution recommandée

### Choix principal : Debian

:::tip Recommandation

J'utilise principalement **Debian** (dernière version stable) pour mes déploiements K3s.

:::

:::warning Problème connu avec Ubuntu

Ubuntu peut présenter des problèmes avec NetworkManager qui bloque certaines requêtes DNS. Des modifications manuelles sont nécessaires pour résoudre ce problème.

:::

## 🥧 Configuration spécifique Raspberry Pi 5

### Prérequis réseau

Pour les Raspberry Pi connectés en **Wi-Fi**, le mode promiscuous doit être activé :

```bash title="Activation temporaire du mode promiscuous"
ifconfig wlan0 promisc
```

:::warning Persistance

Cette commande n'est pas persistante après redémarrage. Une solution automatique est nécessaire.

:::

### Solution permanente avec systemd

Script basé sur [cette solution StackOverflow](https://askubuntu.com/questions/1355974/how-to-enable-promiscuous-mode-permanently-on-a-nic-managed-by-networkmanager) :

```bash title="Création du service systemd"
sudo bash -c 'cat > /etc/systemd/system/bridge-promisc.service' <<'EOS'
[Unit]
Description=Active le mode promiscuous au démarrage
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/sbin/ip link set dev wlan0 promisc on
TimeoutStartSec=0
RemainAfterExit=yes

[Install]
WantedBy=default.target
EOS
```

```bash title="Activation du service"
sudo systemctl enable bridge-promisc
```

:::note Adaptation nécessaire

Adaptez le nom de l'interface (`wlan0`) selon votre configuration.

:::

## 🔧 Configuration kernel Raspberry Pi

### Problème des pages mémoire

Certains conteneurs (comme **Redis**) utilisent des pages de 16K, mais Raspberry Pi OS limite à 4K par défaut.

:::danger Erreur fréquente

Sans cette configuration, des conteneurs peuvent échouer au démarrage avec des erreurs mémoire.

:::

### Solution

```bash title="Édition du fichier de configuration"
sudo nano /boot/config.txt
```

Ajoutez la ligne suivante :

```txt title="/boot/config.txt"
kernel=kernel8.img
```

:::tip Redémarrage requis

Un redémarrage est nécessaire pour appliquer cette modification.

:::

## 🗂️ Support NFS

### Prérequis pour les volumes NFS

Si vous utilisez des volumes NFS dans vos pods :

```yaml title="Exemple de volume NFS"
volumes:
  - name: vol1
    nfs:
      server: 192.168.1.100
      path: /mnt/shared-data
```

### Configuration requise

```bash title="Installation et activation de rpcbind"
sudo apt update
sudo apt install nfs-common
sudo systemctl enable rpcbind
sudo systemctl start rpcbind
```

:::warning Symptôme d'erreur

Sans `rpcbind`, les pods restent en état `Pending` avec des erreurs de montage NFS.

:::

## 🧮 Configuration Cgroup

### Activation des cgroups mémoire

Ajoutez à la fin du fichier `/boot/cmdline.txt` :

```txt title="/boot/cmdline.txt"
cgroup_memory=1 cgroup_enable=memory
```

:::note Format important

Ajoutez ces paramètres **à la suite** de la ligne existante, séparés par des espaces. Ne créez pas de nouvelle ligne.

:::

### Vérification

Après redémarrage, vérifiez l'activation :

```bash title="Vérification des cgroups"
cat /proc/cgroups | grep memory
```

:::tip Résultat attendu

Vous devriez voir une ligne avec `memory` et `1` (activé).

:::

## 🚀 Prochaines étapes

Une fois ces prérequis configurés :

1. **Redémarrez** votre système
2. **Vérifiez** les configurations
3. **Procédez** à l'installation K3s
4. **Configurez** votre cluster

:::note Articles connexes

- [Installation serveur/node K3s](./installation-server-node-k3s.md)
- [Load balancer NGINX](./loadbalancer-nginx.md)

:::

## 📝 Checklist finale

Avant d'installer K3s, vérifiez :

- [ ] **Distribution** : Debian installée
- [ ] **Réseau** : Mode promiscuous activé (Wi-Fi)
- [ ] **Kernel** : Configuration 16K pages (Raspberry Pi)
- [ ] **NFS** : rpcbind installé et activé
- [ ] **Cgroups** : Mémoire activée
- [ ] **Système** : Redémarré après modifications

:::tip Prêt pour K3s

Une fois tous ces prérequis remplis, votre système est prêt pour l'installation K3s !

:::
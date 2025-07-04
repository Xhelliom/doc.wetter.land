---
sidebar_position: 4
sidebar_label: 🔧 Installation d'un nœud K3s
---

# 🔧 Installation d'un nœud K3s

Guide détaillé pour installer et configurer un nœud K3s dans un cluster existant.

## 📦 Installation des dépendances

### Packages système requis

```bash title="Installation des dépendances système"
sudo apt update
sudo apt install curl open-iscsi nfs-common
```

:::info Utilité des packages

- **curl** : Téléchargement du script d'installation K3s
- **open-iscsi** : Support des volumes iSCSI
- **nfs-common** : Support des volumes NFS

:::

## 🌐 Configuration réseau

### Interface réseau statique

```bash title="Configuration interface réseau"
sudo nano /etc/network/interfaces
```

```bash title="Exemple configuration statique"
iface ens18 inet static
    address 192.168.1.133
    netmask 255.255.255.0
    gateway 192.168.1.1
```

:::tip Adaptation nécessaire

Adaptez les adresses IP selon votre environnement réseau.

:::

## 👤 Configuration utilisateur

### Ajout des privilèges sudo

```bash title="Ajout de l'utilisateur au groupe sudo"
sudo usermod -aG sudo [nom-utilisateur]
```

:::note Reconnexion requise

Déconnectez-vous et reconnectez-vous pour que les changements prennent effet.

:::

## 📁 Préparation des dossiers K3s

### Création de l'arborescence

```bash title="Création du répertoire de configuration"
sudo mkdir -p /etc/rancher/k3s
```

## ⚙️ Configuration du nœud K3s

### Fichier de configuration principal

```bash title="Création du fichier de configuration"
sudo nano /etc/rancher/k3s/config.yaml
```

```yaml title="/etc/rancher/k3s/config.yaml"
# Configuration d'un nœud K3s
server: "https://192.168.1.110:6443"  # IP du load balancer
token: "K1032a827d886e59693bxxxxxxxxxxxxxxxxxxxxx0e51d8b1e1833cb92::server:e6407563a402axxxxxxxxxxxdc33ce2b0b"

# Certificats TLS - IPs de tous les serveurs du cluster
tls-san:
  - "192.168.1.110"  # Load balancer
  - "192.168.1.121"  # Serveur K3s 1
  - "192.168.1.141"  # Serveur K3s 2
  - "192.168.1.146"  # Serveur K3s 3
  - "192.168.1.147"  # Serveur K3s 4

# Configuration kubelet
kubelet-arg: "config=/etc/rancher/k3s/kubelet.config"

# Taint pour les nœuds de contrôle
node-taint:
  - "k3s-controlplane=true:NoExecute"

# Services désactivés
disable:
  - traefik
  - servicelb
  - local-storage
```

:::warning Token sécurisé

Le token est sensible ! Gardez-le secret et ne le partagez qu'avec les administrateurs autorisés.

:::

### 📝 Explications des paramètres

| Paramètre | Description |
|-----------|-------------|
| `server` | URL du serveur K3s principal (via load balancer) |
| `token` | Token d'authentification du cluster |
| `tls-san` | Subject Alternative Names pour les certificats TLS |
| `kubelet-arg` | Arguments supplémentaires pour kubelet |
| `node-taint` | Taint pour éviter les pods sur les nœuds de contrôle |
| `disable` | Services K3s désactivés |

### 🔑 Récupération du token

Sur le **premier serveur K3s** :

```bash title="Récupération du token"
sudo cat /var/lib/rancher/k3s/server/node-token
```

:::tip Sécurité

Conservez ce token dans un gestionnaire de mots de passe sécurisé.

:::

## 🔧 Configuration avancée Kubelet

### Paramètres supplémentaires

```bash title="Configuration kubelet avancée"
sudo nano /etc/rancher/k3s/kubelet.config
```

```yaml title="/etc/rancher/k3s/kubelet.config"
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration

# Gestion gracieuse des arrêts
shutdownGracePeriod: 30s
shutdownGracePeriodCriticalPods: 10s

# Limites de ressources
maxPods: 110
```

:::info Paramètres de shutdown

- **shutdownGracePeriod** : Temps d'arrêt gracieux général
- **shutdownGracePeriodCriticalPods** : Temps pour les pods critiques

:::

## 🚀 Installation K3s

### Installation standard

```bash title="Installation K3s avec configuration"
curl -sfL https://get.k3s.io | sh -s - --config /etc/rancher/k3s/config.yaml
```

### Installation d'une version spécifique

```bash title="Installation d'une version particulière"
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION=v1.29.3+k3s1 sh -s - --config /etc/rancher/k3s/config.yaml
```

:::tip Versions disponibles

Consultez les [releases GitHub K3s](https://github.com/k3s-io/k3s/releases) pour voir les versions disponibles.

:::

## 🔄 Gestion du service

### Commandes utiles

```bash title="Redémarrage après modification"
sudo systemctl restart k3s
```

```bash title="Vérification du statut"
sudo systemctl status k3s
```

```bash title="Consultation des logs"
sudo journalctl -u k3s -f
```

## ✅ Vérification de l'installation

### Vérification du nœud

```bash title="Liste des nœuds"
sudo kubectl get nodes
```

```bash title="Détails du nœud"
sudo kubectl describe node $(hostname)
```

:::tip Résultat attendu

Votre nœud devrait apparaître avec le statut `Ready`.

:::

## 🛠️ Dépannage

### Problèmes courants

<details>
<summary>Le nœud n'apparaît pas dans le cluster</summary>

**Causes possibles :**
- Token incorrect
- Problème réseau
- Certificats TLS invalides

**Solution :**
1. Vérifiez le token
2. Testez la connectivité réseau
3. Vérifiez les IPs dans `tls-san`
</details>

<details>
<summary>Pods en état Pending</summary>

**Causes possibles :**
- Taint sur le nœud
- Ressources insuffisantes
- Problème de réseau

**Solution :**
1. Vérifiez les taints : `kubectl describe node`
2. Vérifiez les ressources : `kubectl top nodes`
</details>

:::note Articles connexes

- [Création du cluster K3s](./creation-du-cluster.md)
- [Load balancer NGINX](./loadbalancer-nginx.md)

:::


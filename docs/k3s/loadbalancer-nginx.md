---
sidebar_position: 3
sidebar_label: ⚖️ Load Balancer NGINX pour K3s
---

# ⚖️ Load Balancer NGINX pour Kubernetes

Guide pour configurer NGINX comme load balancer pour votre cluster K3s, gérant à la fois l'API Kubernetes et le trafic applicatif.

## 🎯 Objectif

Mettre en place un load balancer NGINX pour :
- **Répartir le trafic** vers les serveurs K3s
- **Assurer la haute disponibilité** de l'API Kubernetes
- **Gérer le routage** HTTP/HTTPS des applications

## 📦 Installation

```bash title="Installation NGINX"
sudo apt update
sudo apt install nginx
```

:::tip Vérification

Vérifiez que NGINX est démarré :
```bash
sudo systemctl status nginx
```

:::

## ⚙️ Configuration Load Balancer

### Édition du fichier principal

```bash title="Édition de la configuration NGINX"
sudo nano /etc/nginx/nginx.conf
```

### Configuration complète

```nginx title="/etc/nginx/nginx.conf"
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 8192;
    # multi_accept on;
}

# Configuration Stream pour le load balancing
stream {
    # Pool de serveurs K3s pour l'API Kubernetes
    upstream k3s_servers {
        server 192.168.1.121:6443;  # Serveur K3s 1
        server 192.168.1.141:6443;  # Serveur K3s 2
        server 192.168.1.146:6443;  # Serveur K3s 3
    }

    # Pool pour services TCP personnalisés
    upstream tcp_backend {
        server 192.168.1.121:30053;
        server 192.168.1.141:30053;
        server 192.168.1.146:30053;
    }

    # Pool pour services UDP personnalisés
    upstream udp_backend {
        server 192.168.1.121:30054;
        server 192.168.1.141:30054;
        server 192.168.1.146:30054;
    }

    # Load balancer pour l'API Kubernetes (port 6443)
    server {
        listen 6443;
        proxy_pass k3s_servers;
        proxy_timeout 10s;
        proxy_connect_timeout 5s;
    }

    # Load balancer TCP personnalisé
    server {
        listen 43;
        proxy_pass tcp_backend;
        proxy_timeout 1s;
        proxy_connect_timeout 1s;
    }

    # Load balancer UDP personnalisé
    server {
        listen 43 udp;
        proxy_pass udp_backend;
        proxy_timeout 1s;
        proxy_responses 1;
    }
}

# Configuration HTTP standard (à conserver)
http {
    # ... configuration HTTP existante ...
}
```

:::warning Adresses IP

Remplacez les adresses IP par celles de vos serveurs K3s réels.

:::

## 🌐 Configuration du trafic HTTP/HTTPS

### Édition du site par défaut

```bash title="Configuration du site par défaut"
sudo nano /etc/nginx/sites-available/default
```

### Routage vers Ingress Controller

```nginx title="/etc/nginx/sites-available/default"
# Serveur HTTP (port 80)
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://192.168.1.121;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Serveur HTTPS (port 443)
server {
    listen 443;
    server_name _;
    
    location / {
        proxy_pass https://192.168.1.121;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Configuration SSL proxy
        proxy_ssl_verify off;
    }
}
```

:::note Ingress Controller

Cette configuration suppose que votre Ingress Controller (Traefik, Nginx-Ingress, etc.) écoute sur le port 80/443 des nœuds K3s.

:::

## 🔧 Gestion du service

### Vérification de la configuration

```bash title="Test de la configuration"
sudo nginx -t
```

### Redémarrage du service

```bash title="Redémarrage NGINX"
sudo systemctl restart nginx
```

### Activation au démarrage

```bash title="Activation automatique"
sudo systemctl enable nginx
```

## ✅ Vérification du fonctionnement

### Test de l'API Kubernetes

```bash title="Test de l'API via le load balancer"
curl -k https://192.168.1.110:6443/version
```

:::tip Résultat attendu

Vous devriez recevoir une réponse JSON avec la version de Kubernetes.

:::

### Test du trafic HTTP

```bash title="Test HTTP"
curl http://192.168.1.110
```

## 📊 Monitoring et logs

### Consultation des logs

```bash title="Logs NGINX"
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Statistiques en temps réel

```bash title="Monitoring des connexions"
sudo netstat -tlnp | grep nginx
```

## 🛠️ Configuration avancée

### Health checks

```nginx title="Configuration avec health checks"
upstream k3s_servers {
    server 192.168.1.121:6443 max_fails=3 fail_timeout=30s;
    server 192.168.1.141:6443 max_fails=3 fail_timeout=30s;
    server 192.168.1.146:6443 max_fails=3 fail_timeout=30s;
}
```

### Load balancing par IP

```nginx title="Persistance de session par IP"
upstream k3s_servers {
    ip_hash;
    server 192.168.1.121:6443;
    server 192.168.1.141:6443;
    server 192.168.1.146:6443;
}
```

:::info Méthodes de load balancing

- **round-robin** (défaut) : Répartition circulaire
- **ip_hash** : Persistance par IP client
- **least_conn** : Serveur avec le moins de connexions

:::

## 🚨 Dépannage

### Problèmes courants

<details>
<summary>Erreur "Connection refused"</summary>

**Causes possibles :**
- Serveur K3s arrêté
- Mauvaise configuration IP
- Firewall bloquant

**Solution :**
1. Vérifiez l'état des serveurs K3s
2. Testez la connectivité réseau
3. Vérifiez les règles firewall
</details>

<details>
<summary>Timeouts fréquents</summary>

**Causes possibles :**
- Timeout trop court
- Charge trop élevée
- Problème réseau

**Solution :**
1. Augmentez les timeouts
2. Ajoutez des serveurs au pool
3. Vérifiez la latence réseau
</details>

## 📋 Checklist de validation

- [ ] **Installation** : NGINX installé et démarré
- [ ] **Configuration** : Fichiers de configuration créés
- [ ] **Syntaxe** : Configuration testée avec `nginx -t`
- [ ] **Service** : NGINX redémarré et activé
- [ ] **API K3s** : Accessible via le load balancer
- [ ] **HTTP/HTTPS** : Trafic routé vers les applications
- [ ] **Logs** : Pas d'erreurs dans les logs

:::tip Haute disponibilité

Pour une vraie haute disponibilité, déployez plusieurs instances de ce load balancer avec un VIP (Virtual IP) géré par keepalived ou HAProxy.

:::

## 🔗 Articles connexes

- [Création du cluster K3s](./creation-du-cluster.md)
- [Installation nœud K3s](./installation-server-node-k3s.md)
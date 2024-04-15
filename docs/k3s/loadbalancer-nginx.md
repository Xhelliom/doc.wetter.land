---
sidebar_position: 2
---

# Introduction

Afin de rerouter le traffique sur les serveurs de k3s, nous allons utiliser nginx en tant que load balancer.

# Installation

```bash
sudo apt install nginx
```

Nous allons configurer nginx pour que les requêtes sur les ports 6443 et 43 soient redirigées vers les serveurs k3s.

POur cela éditons le fichier `/etc/nginx/nginx.conf` et ajoutons les lignes suivantes :

```yaml
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
        worker_connections 8192;
        # multi_accept on;
}

stream {
  upstream k3s_servers {
    server 192.168.1.xxx:6443;
    server 192.168.1.xxx:6443;
    server 192.168.1.xxx:6443;
  }

  upstream tcp_backend {
    server 192.168.1.xxx:30053;
    server 192.168.1.xxx:30053;
    server 192.168.1.xxx:30053;
  }
  upstream udp_backend {
    server 192.168.1.xxx:30054;
    server 192.168.1.xxx:30054;
    server 192.168.1.xxx:30054;

  }


  server {
    listen 6443;
    proxy_pass k3s_servers;
  }

  server {
      listen 43;
      proxy_pass tcp_backend;
      proxy_timeout 1s;
  }
  server {
      listen 43 udp;
      proxy_pass udp_backend;
      proxy_timeout 1s;
  }

}

### laisser la suite de la configuration

```

## Nous allons ensuite rediriger les requetes HTTP et HTTPS vers le ingress controller (dans mon cas c'est traefik)

Nous allons donc éditer le fichier `/etc/nginx/sites-available/default` et ajouter les lignes suivantes :

```yaml	
server {
    listen 80;
    server_name default_server;
    location / {
        proxy_pass http://192.168.1.xxx;
    }
}
server {
listen 443;
server_name default_server;
    location / {
        proxy_pass https://192.168.1.xxx;
    }
}
```
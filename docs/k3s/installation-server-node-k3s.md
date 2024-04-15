---
sidebar_position: 2
---

# Installation de quelques dépendances : 

`apt install curl`

# configuration du réseau

```bash
iface ens18 inet static
        address 192.168.1.133
        gateway 192.168.1.1
```

# Rajout de l'utilisateur à sudo :

```sudo usermod -aG sudo [name-of-user]```

# Installation des packages prérequis pour k3s et des dossiers 

Création du dossier avec les configs :

`mkdir -p /etc/rancher/k3s`

Création du fichier de configuration pour un serveur k3s :

`nano /etc/rancher/k3s/config.yaml`, dans ce fichier, nous écrirons : 
```yaml
# k3s agent config file to store in /etc/rancher/k3s/config.yaml

server: "https://192.168.1.120:6443" # ip du loadbalancer nginx
token: "K1032a827d886e59693bxxxxxxxxxxxxxxxxxxxxx0e51d8b1e1833cb92::server:e6407563a402axxxxxxxxxxxdc33ce2b0b"

# https-listen-port: 6443

kubelet-arg: "config=/etc/rancher/k3s/kubelet.config"

node-taint:
    - "k3s-controlplane=true:NoExecute"

disable:
    - traefik
    - servicelb
    - local-storage
# protect-kernel-defaults: true
# secrets-encryption: true
```

Le token se trouve sur le premier serveur :

`cat /var/lib/rancher/k3s/server/node-token`

# Rajout de paramètres optionnels dans le fichier de configuration de kubelet :

`nano /etc/rancher/k3s/kubelet.config`

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration

shutdownGracePeriod: 30s
shutdownGracePeriodCriticalPods: 10s
```


Pour lancer l'installation du serveur (et joindre le cluster):

`curl -sfL https://get.k3s.io | sh -s - --config /etc/rancher/k3s/config.yaml`


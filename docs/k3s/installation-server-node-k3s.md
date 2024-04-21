---
sidebar_position: 3
---

# Installation de quelques dépendances : 

```bash
apt install curl open-iscsi nfs-common
```
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

server: "https://192.168.1.110:6443" # ip du loadbalancer nginx
token: "K1032a827d886e59693bxxxxxxxxxxxxxxxxxxxxx0e51d8b1e1833cb92::server:e6407563a402axxxxxxxxxxxdc33ce2b0b"
tls-san:
    - "192.168.1.110"
    - "192.168.1.121"
    - "192.168.1.141"
    - "192.168.1.146"
    - "192.168.1.147"
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

Quelques informations supplémentaires :
- `server` : l'adresse IP du loadbalancer nginx
- `token` : le token du premier serveur k3s
- `tls-san` : les adresses IP des serveurs k3s (sans ça lorsque les autres serveurs vont essayer de rejoindrel le cluster, une erreur de certificat apparait)
- `kubelet-arg` : permet de spécifier un fichier de configuration pour le kubelet (pour ajouter des arguments)
- `node-taint` : permet de tainter le serveur (pour qu'aucun pods ne s'éxécute sur ce serveur par exemple)
- `disable` : permet de désactiver certains composants (ex: traefik, servicelb, local-storage)

Pour ma part, je préfère avoir le contrôle sur traefik et sur le service de loadbalancer interne à kubernetes (j'utiliserai plus tard metalLB).

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


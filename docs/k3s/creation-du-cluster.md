---
sidebar_position: 2
---

# Prérequis en terme de distribution

Pour ma part j'utilise principalement Debian (dernière version), j'ai remarqué qu'avec Ubuntu j'avais des problème sur le network manager qui bloquait des requetes DNS dans mes souvenirs. je devais trafiquer le network manager pour résoudre ça.
J'utilise aussi des Raspberry Pi 5. pour cela, des manipent peuvent être nécessaires, j'y reviens juste en dessous.

## Raspberry Pi 5, prérequis particulier

### Network

Dans le cas où on utilise Raspberry Pi OS, et qu'on décide de le connecter en Wifi, il faut activer le mode promiscuous, pour cela :

`ifconfig wlan0 promisc` mais ça ne reste pas après reboot.


J'ai donc utilisé un script (trouvé ici : https://askubuntu.com/questions/1355974/how-to-enable-promiscuous-mode-permanently-on-a-nic-managed-by-networkmanager)
```bash
$ sudo bash -c 'cat > /etc/systemd/system/bridge-promisc.service' <<'EOS'
[Unit]
Description=Makes interfaces run in promiscuous mode at boot
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/sbin/ip link set dev eth1 promisc on
ExecStart=/usr/sbin/ip link set dev eth2 promisc on
TimeoutStartSec=0
RemainAfterExit=yes

[Install]
WantedBy=default.target
EOS
$ sudo systemctl enable bridge-promisc
```

### Kernel
Deuxième choses, certains containeurs (ex: Redis) utilise des pages de 16k et raspberry Pi OS limite à 4K.

Il faut donc rajotuer la ligne `kernel=kernel8.img` dans `/boot/config.txt`.

### Application manquantes ou équivalent

Si vous essayer de créer un déploiement ou pod avec un volume NFS, vous aurez peut-être un message.
Exemple de volume NFS monté :
```
 volumes:
    - name: vol1
      nfs:
        server: 192.168.1.xx
        path: /mnt/xxx
```

I faut activer le service rpcbind

```
service rpcbind start

systemctl enable rpcbind
```

Si vous ne faites pas ça, les pods ne vont pas pouvoir monter le volume.

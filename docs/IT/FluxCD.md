---
sidebar_position: 2
sidebar_label: Déployer ses applications avec FluxCD
---

# Prérequis

Il faut avoir un cluster kubernetes (évidemment) et un repo github qui hébergera les configurations des déploiement.
Il faudra aussi avoir un jeton d'accès pour ce repo depuis github.

# FluxCD

FluxCD permet de faire du déploiment d'application sur Kubernetes mais aussi de les maintenir à jour.
Je me base essentiellement sur la documentation de FluxCD mais en essayant de l'expliquer de facon à ce que des gens normaux comprennent.

## Installation du CLI Flux :

Sources : https://fluxcd.io/flux/installation/#install-the-flux-cli

The Flux CLI is available as a binary executable for all major platforms, the binaries can be downloaded from GitHub releases page.

`choco install flux`
To configure your shell to load flux bash completions add to your profile:

`. <(flux completion bash)`


## Initialisation du repo github en liens avec notre cluster kubernetes

J'utilise le "Flux Bootstrap for Github", comprendre que c'est une commande qui permet d'initialiser fluxCD et mettre en liens un repo github et notre cluster.
Cette commande va créer des PODS sur notre cluster kubernetes.

Pour infos, ca peut etre relancer pour mettre à jour, etc. De toute manière, l'ensemble des infos sont stocké sur le repo github et donc détruire les pods, et refaire ça n'a pas l'air d'avoir de conséquences problématiques.

la commande que j'éxécute est la suivante : 

```bash

flux bootstrap github \
    --components-extra=image-reflector-controller,image-automation-controller \
  --token-auth \
  --owner=my-github-username \
  --repository=my-repository-name \
  --branch=main \
  --path=clusters/production\
  --personal
```

A noter que le path peut etre modifié, si vous géré plusieurs clusters dans ce meme repo, on peut très bien imaginé un chemin clusters/aws etc.

## Structure du repo fluxCD

De mon côté la structure que j'utilise est celle-ci, mais je pense qu'on fait comme on le souhaite :

REPO
└── clusters
    ├── production
    │   ├── (namespace)
    │   ├── default
    │   │   ├── redis
    │   │   │   ├── redis.deployment.yml
    │   │   │   ├── redis.service.yml
    │   │   │   ├── redis.ingress.yml    
    │   │   │   ├── redis.certificate.yml    
    │   │   │   ├── redis.policy.yml       
    │   │   │   └── redis.registry.yml
    │   │   └── (etc.)
    │   ├── flux-system
    │   ├── public
    │   └── (etc.)
    └── staging

On retrouve pour l'exemple de redis, les fichiers yaml classiques (ici: deployment, service, ingress). Il pourrait y en avoir d'autre si nécessaire. A comprendre que flux lit ces fichiers et créé les ressources ou les met à jours, en fonction de ce qui a dedans le fichier YAML et non le nom du fichier.

Ce qui est nécessaire de rajouter en plus pour que fluxCD automatise les mises à jours sont les fichiers de registre (registry.yml) et les certificats (policy.yml) ainsi qu'une annotation sur le fichier deployment.yml.

## Rxemple de fichiers YAML

redis.policy.yml 
``` yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: redis
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: redis
  policy:
    semver:
      range: 6.0.x
```

redis.registry.yml

``` yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: redis
  namespace: flux-system
spec:
  image: redis
  interval: 5m0s
```

redis.deployment.yml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: default
spec:
  selector:
    matchLabels:
      app: redis
      namespace: default
  replicas: 1
  template:
    metadata:
      labels:
        app: redis
        namespace: default
    spec:
      containers:
      - name: redis
        namespace: default
        image: redis:6.0.20 # {"$imagepolicy": "flux-system:redis"}
        resources:
          limits:
            memory: "128Mi"
            cpu: "500m"
        ports:
        - containerPort: 80
```

Ce qu'il faut faire correspondre, c'est le nom de l'image dans le registre, et le nom de l'image dans le fichier YAML.

## Reconcialiation manuelle :

Se placer dans le repo git : 
`flux reconcile kustomization flux-system --with-source` 
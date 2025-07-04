---
sidebar_position: 2
sidebar_label: 🚀 Déployer ses applications avec FluxCD
---

# 🚀 Déploiement continu avec FluxCD

FluxCD est un outil de déploiement continu (GitOps) qui permet de déployer et maintenir automatiquement vos applications sur Kubernetes en se basant sur un dépôt Git.

## 📋 Prérequis

:::note Pré-requis obligatoires

- **Cluster Kubernetes** fonctionnel
- **Dépôt GitHub** pour héberger les configurations de déploiement
- **Token d'accès** GitHub avec les permissions appropriées

:::

## 🎯 Qu'est-ce que FluxCD ?

FluxCD implémente le pattern **GitOps** pour Kubernetes :
- 📦 **Déploiement automatique** des applications
- 🔄 **Synchronisation continue** avec Git
- 📈 **Mise à jour automatique** des images
- 🛡️ **Gestion des rollbacks** en cas d'erreur

:::tip Avantages du GitOps

- **Git comme source unique de vérité**
- **Traçabilité complète** des changements
- **Rollback facile** via l'historique Git
- **Déploiement déclaratif** et prévisible

:::

## 🛠️ Installation du CLI Flux

:::info Installation recommandée

La meilleure façon d'installer Flux CLI dépend de votre système d'exploitation.

:::

### Windows (Chocolatey)

```bash title="Installation via Chocolatey"
choco install flux
```

### Configuration du shell

Pour activer l'auto-complétion bash, ajoutez à votre profil :

```bash title="~/.bashrc ou ~/.zshrc"
. <(flux completion bash)
```

:::note Source officielle

Documentation complète : https://fluxcd.io/flux/installation/#install-the-flux-cli

:::

## 🔧 Initialisation du dépôt GitHub

La commande `flux bootstrap` configure FluxCD et lie votre dépôt GitHub au cluster Kubernetes.

:::warning Important

Cette commande peut être relancée pour mettre à jour FluxCD. Toutes les configurations sont stockées dans Git, donc la suppression des pods n'a pas d'impact négatif.

:::

```bash title="Commande d'initialisation FluxCD"
flux bootstrap github \
    --components-extra=image-reflector-controller,image-automation-controller \
    --token-auth \
    --owner=my-github-username \
    --repository=my-repository-name \
    --branch=main \
    --path=clusters/production \
    --personal
```

### 📝 Explication des paramètres

| Paramètre | Description |
|-----------|-------------|
| `--components-extra` | Ajoute les contrôleurs pour la gestion automatique des images |
| `--token-auth` | Utilise l'authentification par token GitHub |
| `--owner` | Nom d'utilisateur GitHub |
| `--repository` | Nom du dépôt |
| `--branch` | Branche à surveiller (généralement `main`) |
| `--path` | Chemin dans le dépôt pour ce cluster |
| `--personal` | Indique que c'est un dépôt personnel |

:::tip Gestion multi-cluster

Vous pouvez gérer plusieurs clusters dans le même dépôt :
- `clusters/production`
- `clusters/staging`
- `clusters/development`

:::

## 📁 Structure du dépôt FluxCD

Voici la structure recommandée pour organiser vos déploiements :

```
REPO/
└── clusters/
    ├── production/
    │   ├── flux-system/          # Configuration FluxCD
    │   ├── default/              # Namespace par défaut
    │   │   ├── redis/
    │   │   │   ├── redis.deployment.yml
    │   │   │   ├── redis.service.yml
    │   │   │   ├── redis.ingress.yml
    │   │   │   ├── redis.certificate.yml
    │   │   │   ├── redis.policy.yml
    │   │   │   └── redis.registry.yml
    │   │   └── (autres applications...)
    │   ├── public/               # Applications publiques
    │   └── (autres namespaces...)
    └── staging/                  # Environnement de test
```

:::note Organisation flexible

Cette structure est **recommandée** mais peut être adaptée selon vos besoins. FluxCD lit le contenu des fichiers YAML, pas leur nom.

:::

## 📄 Fichiers de configuration

Pour que FluxCD gère automatiquement les mises à jour d'images, vous devez créer des fichiers spécifiques :

### 🔍 Registre d'images (`redis.registry.yml`)

```yaml title="redis.registry.yml"
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: redis
  namespace: flux-system
spec:
  image: redis
  interval: 5m0s
```

### 📋 Politique de version (`redis.policy.yml`)

```yaml title="redis.policy.yml"
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

### 🚀 Déploiement (`redis.deployment.yml`)

```yaml title="redis.deployment.yml"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: default
spec:
  selector:
    matchLabels:
      app: redis
  replicas: 1
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:6.0.20 # {"$imagepolicy": "flux-system:redis"}
        resources:
          limits:
            memory: "128Mi"
            cpu: "500m"
        ports:
        - containerPort: 6379
```

:::warning Annotation cruciale

L'annotation `# {"$imagepolicy": "flux-system:redis"}` est **essentielle** pour que FluxCD puisse mettre à jour automatiquement l'image.

:::

### 🔗 Correspondance des noms

:::tip Règle importante

Les noms suivants **doivent correspondre** :
- Nom de l'image dans le registre : `redis`
- Nom dans `imageRepositoryRef` : `redis`
- Nom dans l'annotation imagepolicy : `redis`

:::

## 🔄 Réconciliation manuelle

Si vous voulez forcer une synchronisation immédiate :

```bash title="Commande de réconciliation"
flux reconcile kustomization flux-system --with-source
```

:::note Emplacement

Exécutez cette commande depuis le répertoire de votre dépôt Git local.

:::

## 🎯 Prochaines étapes

Une fois FluxCD configuré, vos déploiements sont automatisés :

1. **Modifiez** vos fichiers YAML dans Git
2. **Commitez** et **pushez** vos changements
3. **FluxCD détecte** automatiquement les modifications
4. **Déploiement** automatique sur le cluster

:::tip Monitoring

Utilisez `flux get all` pour surveiller l'état de vos déploiements FluxCD.

:::
---
sidebar_position: 1
sidebar_label: 🔑 Connexion SSH Git Pro/Perso
---

# 🔑 Gestion de multiple comptes GitHub avec SSH

Guide pour configurer différentes clés SSH selon vos projets professionnels et personnels.

:::note Source

Article traduit et adapté depuis [GitHub oanhnn](https://gist.github.com/oanhnn/80a89405ab9023894df7)

:::

## 🎯 Objectif

Permettre l'utilisation de **plusieurs comptes GitHub** avec des clés SSH différentes selon le contexte (travail, personnel, client, etc.).

## 🔐 Création d'une nouvelle clé SSH

### Générer la clé pour votre compte professionnel

```bash title="Génération clé SSH professionnelle"
ssh-keygen -t rsa -C "your-work-email@example.com" -f ~/.ssh/id_rsa_github-work
```

:::tip Paramètres expliqués

- `-t rsa` : Type de clé (RSA recommandé)
- `-C` : Commentaire (généralement votre email)
- `-f` : Nom et emplacement du fichier de clé

:::

### Ajouter la clé à votre compte GitHub

1. **Copiez la clé publique** :

```bash title="Copier la clé publique"
cat ~/.ssh/id_rsa_github-work.pub
```

2. **Ajoutez-la** dans GitHub → Settings → SSH and GPG keys

:::warning Sécurité

Ne partagez **jamais** votre clé privée (`id_rsa_github-work` sans `.pub`). Seule la clé publique doit être ajoutée à GitHub.

:::

## ⚙️ Configuration SSH

### Créer le fichier de configuration

```bash title="Éditer le fichier de configuration SSH"
nano ~/.ssh/config
```

### Configuration complète

```bash title="~/.ssh/config"
# Compte GitHub personnel (par défaut)
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa

# Compte GitHub professionnel
Host github.com-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa_github-work
```

:::note Explication des paramètres

- **Host** : Alias pour la connexion
- **HostName** : Serveur réel (toujours github.com)
- **User** : Toujours `git` pour GitHub
- **IdentityFile** : Chemin vers votre clé privée

:::

## 🚀 Utilisation pratique

### Cloner avec le compte professionnel

```bash title="Clone avec compte professionnel"
git clone git@github.com-work:username/repo.git
```

### Cloner avec le compte personnel

```bash title="Clone avec compte personnel (par défaut)"
git clone git@github.com:username/repo.git
```

:::tip Astuce

Notez la différence dans l'URL :
- **Personnel** : `git@github.com:username/repo.git`
- **Professionnel** : `git@github.com-work:username/repo.git`

:::

## 🔧 Configuration avancée

### Ajouter d'autres comptes

Vous pouvez ajouter autant de comptes que nécessaire :

```bash title="Configuration multi-comptes"
# Compte personnel
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa

# Compte professionnel
Host github.com-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa_github-work

# Compte client
Host github.com-client
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa_github-client
```

### Gestion des remotes existants

Si vous avez déjà un dépôt cloné, vous pouvez changer l'URL :

```bash title="Changer l'URL du remote"
git remote set-url origin git@github.com-work:username/repo.git
```

## ✅ Vérification de la configuration

### Tester la connexion

```bash title="Test connexion compte personnel"
ssh -T git@github.com
```

```bash title="Test connexion compte professionnel"
ssh -T git@github.com-work
```

:::tip Résultat attendu

Vous devriez voir un message comme :
```
Hi username! You've successfully authenticated, but GitHub does not provide shell access.
```

:::

## 🎉 Résultat

Maintenant vous pouvez :
- ✅ **Gérer plusieurs comptes GitHub** facilement
- ✅ **Séparer** vos projets professionnels et personnels
- ✅ **Utiliser la bonne identité** automatiquement selon le dépôt
- ✅ **Éviter les erreurs** de permissions

:::note Rappel

Pensez à utiliser le bon alias (`github.com-work`) lors du clonage de vos dépôts professionnels !

:::

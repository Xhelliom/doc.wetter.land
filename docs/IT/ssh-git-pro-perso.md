---
sidebar_position: 1
---

Traduit depuis : [github oanhnn](https://gist.github.com/oanhnn/80a89405ab9023894df7)

# Utilisation de plusieurs clés SSH pour un github pro et perso

Si vous travaillez sur plusieurs projets GitHub qui nécessitent des comptes différents, vous pouvez configurer votre ordinateur local pour utiliser des clés SSH différentes pour chaque compte.



## Créer une nouvelle clé SSH

La première étape consiste à créer une nouvelle clé SSH pour votre deuxième compte GitHub. Ouvrez votre terminal et exécutez la commande suivante :
```
ssh-keygen -t rsa -C "your-work-email@example.com" -f ~/.ssh/id_rsa_github-work
```
Remplacez "your-work-email@example.com" par l'adresse e-mail associée à votre deuxième compte GitHub. Le commutateur -f permet de spécifier le nom et l'emplacement de la clé SSH.

Ajouter la nouvelle clé SSH à votre compte GitHub

## Configurer le fichier de configuration SSH

La deuxième étape consiste à configurer le fichier de configuration SSH pour utiliser la bonne clé SSH pour chaque compte GitHub. Ouvrez le fichier de configuration SSH dans un éditeur de texte :

 `nano ~/.ssh/config` par exemple

```
# Default GitHub
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa

# Second GitHub account
Host github.com-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa_github-work
  ```

### Utiliser la clé "work" : 

Maintenant que vous avez configuré votre ordinateur local pour utiliser des clés SSH différentes pour chaque compte GitHub, vous pouvez cloner des dépôts en utilisant la bonne clé SSH. Par exemple, pour cloner un dépôt de votre deuxième compte GitHub, utilisez la commande suivante :

```
git clone git@github.com-work:username/repo.git
```

Remplacez "username" et "repo" par le nom d'utilisateur et le nom du dépôt de votre compte GitHub avec votre mail du travail. Notez que l'URL du dépôt utilise le nom d'hôte configuré dans le fichier de configuration SSH (github.com-work).


Et voilà ! Vous pouvez maintenant utiliser plusieurs comptes GitHub avec des clés SSH différentes sur votre ordinateur local
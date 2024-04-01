import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Cluster Kubernetes',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Toutes les infos sur la création de mon cluster k3S, me permet de me rappeler de ce que j'ai fait, des infos sur le déploiement de mon cluster, etc... 
        Peut-être ça aideras quelqu'un à faire un cluster comme le miens un jour.
      </>
    ),
  },
  {
    title: 'Domotique',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        Beaucoup d'information sur le déploiement de Home Assistant, un peu de hardware.
      </>
    ),
  },
  {
    title: 'Et d\'autres choses aussi',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Tout ce que je trouve interessant à documenter.
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

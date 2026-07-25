import styles from "@/app/topics/[topicId]/_components/editorial-project-cover.module.css";

const variants = ["", styles.variant1, styles.variant2, styles.variant3, styles.variant4, styles.variant5];

function stableVariant(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return variants[hash % variants.length];
}

export function EditorialProjectCover({ id, label }: { id: string; label: string }) {
  return (
    <div className={`${styles.cover} ${stableVariant(id)}`}>
      <span className={styles.label}>{label}</span>
      <span className={styles.wash} aria-hidden="true" />
    </div>
  );
}


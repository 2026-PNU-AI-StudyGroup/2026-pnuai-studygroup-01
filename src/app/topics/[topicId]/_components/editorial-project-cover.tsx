import { UiText } from "@/modules/translation/ui/i18n-provider";
import styles from "@/app/topics/[topicId]/_components/editorial-project-cover.module.css";

export function EditorialProjectCover({ label }: { label: string }) {
  return (
    <div data-editorial-project-cover className={styles.cover}>
      <span aria-hidden="true" data-pnu-mark className={styles.brandMark} />
      <span className={styles.label}><UiText>{label}</UiText></span>
    </div>
  );
}

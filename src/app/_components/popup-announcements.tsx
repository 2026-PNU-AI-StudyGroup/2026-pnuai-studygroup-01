import { PrismaAnnouncementRepository } from "@/modules/announcement/infrastructure/prisma-announcement-repository";
import { LocalizedMarkdown } from "@/modules/translation/ui/localized-markdown";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { NoticeStack, type NoticeItem } from "@/shared/ui/notice-stack";

/**
 * 팝업으로 지정된 공지를 로그인 후 화면 한가운데에 띄운다.
 *
 * 대상을 정하지 않은 전체 공지만 올라온다. 팀이나 프로그램 공지는 볼 사람이
 * 정해져 있어 창으로 띄우지 않는다.
 */
export async function PopupAnnouncements() {
  const announcements = await new PrismaAnnouncementRepository(prisma).listPopups();
  if (announcements.length === 0) return null;
  // 최근 공지가 맨 앞장에 오도록 뒤집는다. 목록은 최신순, 창은 마지막이 앞장이다.
  const items: NoticeItem[] = [...announcements].reverse().map((announcement) => ({
    id: announcement.id,
    // 고친 공지는 다시 띄운다. 어제 닫았다는 이유로 바뀐 내용을 놓치면 안 된다.
    storageKey: `aipms:notice:announcement-${announcement.id}-${announcement.updatedAt.getTime()}`,
    badge: "공지",
    title: announcement.title,
    body: <LocalizedMarkdown text={announcement.content} />,
    cta: { href: `/announcements/${announcement.id}`, label: "공지 자세히 보기" },
  }));
  return <NoticeStack items={items} placement="center" />;
}

import { z } from "zod";

const KOREAN_LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function isValidCalendarDateTime(value: string): boolean {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  );
}

export const koreanLocalDateTime = z
  .string()
  .regex(KOREAN_LOCAL_DATE_TIME)
  .transform((value, context) => {
    if (!isValidCalendarDateTime(value)) {
      context.addIssue({ code: "custom", message: "유효하지 않은 날짜입니다." });
      return z.NEVER;
    }

    const date = new Date(`${value}:00+09:00`);

    if (!Number.isFinite(date.getTime())) {
      context.addIssue({ code: "custom", message: "유효하지 않은 날짜입니다." });
      return z.NEVER;
    }

    return date;
  });

const skillList = z.string().transform((value, context) => {
  const skills = [...new Set(value.split(",").map((skill) => skill.trim()).filter(Boolean))];
  if (skills.length > 20 || skills.some((skill) => skill.length > 50)) {
    context.addIssue({ code: "custom", message: "기술은 최대 20개, 항목당 50자까지 입력할 수 있습니다." });
    return z.NEVER;
  }
  return skills;
});

export const createTopicInputSchema = z.object({
  programId: z.string().min(1).max(200),
  divisionId: z.string().uuid().nullable(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(8_000),
  requiredSkills: skillList,
  preferredSkills: skillList,
  roleExpectations: z.string().trim().max(500),
  availabilityRequirement: z.string().trim().max(500),
  recruitmentEnabled: z.enum(["true", "false"]).transform((value) => value === "true"),
  applicationMode: z.enum(["TEAM_ONLY", "INDIVIDUAL_ONLY", "INDIVIDUAL_OR_TEAM"]),
  applicationQuestions: z.array(z.object({
    label: z.string().trim().min(1).max(200),
    maxLength: z.coerce.number().int().min(1).max(5_000),
    required: z.boolean(),
  })).max(20),
  capacity: z.coerce.number().int().min(1).max(100),
}).strict().superRefine((input, context) => {
  if (!input.recruitmentEnabled) return;

  if (input.requiredSkills.length === 0) {
    context.addIssue({ code: "custom", path: ["requiredSkills"], message: "필수 기술을 한 개 이상 입력하세요." });
  }
  if (input.roleExpectations.length === 0) {
    context.addIssue({ code: "custom", path: ["roleExpectations"], message: "예상 역할을 입력하세요." });
  }
  if (input.availabilityRequirement.length === 0) {
    context.addIssue({ code: "custom", path: ["availabilityRequirement"], message: "활동 가능 시간 조건을 입력하세요." });
  }
  if (input.applicationQuestions.length === 0) {
    context.addIssue({ code: "custom", path: ["applicationQuestions"], message: "지원서 문항을 한 개 이상 입력하세요." });
  }
});

export function parseTopicFormData(formData: FormData) {
  const recruitmentEnabled = formData.get("recruitmentEnabled") === "true";
  const questionLabels = formData.getAll("questionLabel");
  const questionMaxLengths = formData.getAll("questionMaxLength");
  const questionRequiredValues = formData.getAll("questionRequired");
  return createTopicInputSchema.safeParse({
    programId: formData.get("programId"),
    divisionId: formData.get("divisionId") || null,
    title: formData.get("title"),
    description: formData.get("description"),
    requiredSkills: recruitmentEnabled ? formData.get("requiredSkills") : "",
    preferredSkills: recruitmentEnabled ? formData.get("preferredSkills") : "",
    roleExpectations: recruitmentEnabled ? formData.get("roleExpectations") : "",
    availabilityRequirement: recruitmentEnabled ? formData.get("availabilityRequirement") : "",
    recruitmentEnabled: String(recruitmentEnabled),
    applicationMode: recruitmentEnabled ? formData.get("applicationMode") : "INDIVIDUAL_ONLY",
    capacity: recruitmentEnabled ? formData.get("capacity") : "1",
    applicationQuestions: recruitmentEnabled ? questionLabels.map((label, index) => ({
      label,
      maxLength: questionMaxLengths[index],
      required: questionRequiredValues[index] === "true",
    })) : [],
  });
}

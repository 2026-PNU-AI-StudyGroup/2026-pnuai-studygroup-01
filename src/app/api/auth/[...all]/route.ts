import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/modules/identity/infrastructure/auth";

export const { GET, POST } = toNextJsHandler(auth);

import { forwardToBackend } from "../_lib/forwardBackend";

export async function POST(request: Request) {
  return forwardToBackend(request, "/api/skill-gap", "POST");
}

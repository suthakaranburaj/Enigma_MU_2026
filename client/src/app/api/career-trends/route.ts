import { forwardToBackend } from "../_lib/forwardBackend";

export async function GET(request: Request) {
  return forwardToBackend(request, "/api/career-trends", "GET");
}

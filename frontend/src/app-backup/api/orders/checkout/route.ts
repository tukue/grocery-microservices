import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { submitOrderOnServer } from "@/features/orders/api/server-order-submission";
import { ApplicationError } from "@/shared/errors/application-error";

function statusForError(error: ApplicationError): number {
  switch (error.kind) {
    case "validation":
      return 400;
    case "unauthorized":
      return 401;
    case "not-found":
      return 404;
    case "service-unavailable":
      return 503;
    case "timeout":
      return 504;
    case "unexpected":
      return 502;
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const input: unknown = await request.json();
    const order = await submitOrderOnServer(input, request.headers);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "Invalid order request" },
        { status: 400 },
      );
    }
    if (error instanceof ApplicationError) {
      return NextResponse.json(
        { message: error.customerMessage },
        { status: statusForError(error) },
      );
    }

    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 502 },
    );
  }
}

import { NextResponse } from "next/server";
import { BackendApiError, cancelBooking, getBooking } from "@/lib/backend";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const booking = await getBooking(id);
    return NextResponse.json(booking);
  } catch (error) {
    if (error instanceof BackendApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const booking = await cancelBooking(id);
    return NextResponse.json(booking);
  } catch (error) {
    if (error instanceof BackendApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    throw error;
  }
}

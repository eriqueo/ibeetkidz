export interface WorkshopBoardRect {
  readonly centerX: number;
  readonly centerY: number;
  readonly width: number;
  readonly height: number;
}

export interface WorkshopBoardActionSlot {
  readonly x: number;
  readonly y: number;
  readonly faceWidth: number;
  readonly faceHeight: number;
  readonly hitWidth: number;
  readonly hitHeight: number;
}

/** Pure geometry for the board's two equal-weight exit/action chips. */
export function workshopBoardActionSlots(
  board: WorkshopBoardRect,
): { readonly sounds: WorkshopBoardActionSlot; readonly done: WorkshopBoardActionSlot } {
  const faceWidth = Math.max(180, board.width * 0.16);
  const faceHeight = Math.max(64, board.height * 0.11);
  const hitWidth = faceWidth * 1.15;
  const hitHeight = faceHeight * 1.25;
  const gap = Math.max(32, faceWidth * 0.2);
  const offset = (hitWidth + gap) / 2;
  const y = board.centerY + board.height / 2 + hitHeight / 2 + Math.max(12, faceHeight * 0.1);
  const slot = (x: number): WorkshopBoardActionSlot => ({
    x,
    y,
    faceWidth,
    faceHeight,
    hitWidth,
    hitHeight,
  });

  return {
    sounds: slot(board.centerX - offset),
    done: slot(board.centerX + offset),
  };
}

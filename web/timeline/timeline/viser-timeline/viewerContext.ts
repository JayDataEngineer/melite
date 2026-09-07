// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
//
// Minimal stub for viser's ViewerContext. The vendored Timeline.tsx reads
// only `viewer?.useGui((state) => state.theme.dark_mode) ?? true`. The motion
// card runs dark (parity with the Kimodo demo), so the stub returns
// dark_mode: true without requiring a provider. No other viewer surface is
// referenced by the timeline component.

import { createContext } from "react";

interface GuiState {
  theme: { dark_mode: boolean };
}

interface ViewerLike {
  useGui: <T>(selector: (state: GuiState) => T) => T;
}

const darkViewer: ViewerLike = {
  useGui: <T,>(selector: (state: GuiState) => T): T =>
    selector({ theme: { dark_mode: true } }),
};

export const ViewerContext = createContext<ViewerLike | null>(darkViewer);

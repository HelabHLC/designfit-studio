# ARBE DesignFit Studio — Creative Workspace v0.6

## Purpose

Release 0.6 introduces the designer-facing journey of the ARBE λ* Platform without pretending that the full production pipeline is already operational.

## User journey

1. **Inspiration** — image, moodboard, prompt, palette or material idea.
2. **Create** — explore atmosphere, harmony, contrast, light and intent.
3. **Reference** — bind selected colour requests to canonical atlas identities.
4. **Materials** — evaluate pigment, substrate and product candidates with provenance.
5. **Produce** — report curve evidence, scissor state, metamerism state and reference-lock readiness.

## Current implementation

This release provides the public information architecture and the initial pages for:

- Create;
- Reference;
- Materials;
- Platform;
- the complete designer journey on the landing page.

It does not yet provide image upload, palette extraction, live Master Repository lookup, recipe solving, Spectral Scissor execution or a Metamerism Gate service.

## Required future workflow

```text
Original input
→ bind input to Master PKL atlas reference
→ solve initial recipe candidate from controlled pigment data
→ compute candidate curve
→ run mandatory Spectral Scissor
→ create scissored target curve
→ solve again against the scissored target
→ run AtlasFit against Master PKL
→ run Metamerism Gate
→ report final verdict
```

## Claim boundary

Creative outputs are requests, not identities. Recipes are candidates, not approvals. A final result is only valid when all required evidence and acceptance gates have been run and reported.

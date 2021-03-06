# Knowledge Base

The dictionary data for the game appears to be stored in a group of 5 files:

- `D.MIL` (88802 bytes)
- `DATAB.MIL` (18669 bytes)
- `DATAPG.MIL` (177582 bytes)
- `M.MIL` (45652 bytes)
- `RNN.MIL` (654 bytes)

The purpose of each file is currently unclear, however some conclusions and hypotheses can be drawn:

- The first file, `D.MIL`, appears to contain word data, as some words and parts of word can be seen when opening 
the file in a text editor.
- `DATAPG.MIL` and possible `DATAB.MIL` may be index files for the first file.

From playing the game using DosBox, whenever verifying words placed by the player, it can be seen that the game opens 4 of the files in the following order: `DATAB.MIL`, `RNN.MIL`, `D.MIL` (twice in a row, not clear if twice every time), `DATAPG.MIL`.

All files are opened within the first 8k-10k instructions.  
A few thousand instructions after that, the mouse cursor is hidden. Perhaps to prevent interrupts? Is an interrupt used to hide it?

The result dialog appears after ~300k instructions.

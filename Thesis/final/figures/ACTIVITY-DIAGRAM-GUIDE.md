# Activity Diagram Generation Guide (TDTUOJ Thesis)

How to generate UML activity diagrams for thesis use cases. Follow this exactly
so every diagram has the same Visual-Paradigm-style look.

## Target style (reference: `example.png`)
- Two swimlanes: **User | System** (split work by who performs the step).
- **Sharp** monochrome rectangles (no rounded corners, no colors).
- **Diamond** decision nodes with labeled branches.
- Full **outer frame** around the whole diagram.
- Boxed **title bar** spanning the full width: `act <Use Case Name>`.
- Lane-header row (User | System) with a separator line under it.
- Loops drawn as `repeat ... repeat while (...)` (e.g. login retry, submit retry).

## Tools (already in `D:\OJ\Thesis\final\figures\`)
- `plantuml.jar` — PlantUML renderer (Java 21 at `C:\Program Files\Java\jdk-21\bin\java.exe`).
- `frame_activity.py` — Python/PIL script that adds the outer frame + title bar +
  lane-header separator to a PlantUML-rendered PNG. Auto-detects the lane divider.
- Python: `C:\Program Files\Python312\python.exe` (PIL/Pillow installed).

> PlantUML's activity engine needs **no Graphviz** (Graphviz is NOT installed).
> Do not add `!pragma layout smetana` to activity diagrams — not needed.
> PlantUML alone **cannot** draw the outer frame / title bar — that is why the
> PIL post-process step exists. Do not skip it.

## Steps

### 1. Write the `.puml` (flow only — NO `title` directive)
The title is added by the PIL step, so omit `title` from the `.puml`.
Use this header verbatim for consistent styling:

```plantuml
@startuml activity-<name>
skinparam shadowing false
skinparam defaultFontName Arial
skinparam defaultFontSize 13
skinparam roundCorner 0
skinparam ArrowColor #000000
skinparam ActivityBackgroundColor #FFFFFF
skinparam ActivityBorderColor #000000
skinparam ActivityFontColor #000000
skinparam ActivityDiamondBackgroundColor #FFFFFF
skinparam ActivityDiamondBorderColor #000000
skinparam SwimlaneTitleFontStyle bold
skinparam SwimlaneBorderColor #000000

|User|
start
... flow, switching lanes with |User| / |System| ...
stop
@enduml
```

Rules for the flow:
- Switch lanes with `|User|` and `|System|`.
- Decisions: `if (Question?) then (branchA) ... else (branchB) ... endif`.
- Loops: `repeat ... repeat while (Question?) is (Yes) not (No)`.
- Keep box text short; use `\n` for a second line.

### 2. Render the flow to PNG
```powershell
cd "D:\OJ\Thesis\final\figures"
& "C:\Program Files\Java\jdk-21\bin\java.exe" -jar plantuml.jar -tpng -o "D:\OJ\Thesis\final\figures" activity-<name>.puml
```

### 3. Add the frame + title bar
Copy `frame_activity.py`, set `SRC`/`DST` to your PNG and `TITLE` to
`act <Use Case Name>`, then run:
```powershell
& "C:\Program Files\Python312\python.exe" frame_activity.py
```
The script:
1. Detects the vertical lane divider (longest dark column run, 30–70% width).
2. Finds the divider top = bottom of the lane-header row.
3. Adds a 34px title bar, the outer frame, the under-title line, the
   under-header line, and extends the divider up through the header row.

### 4. Verify
Open the PNG and confirm: outer frame, title bar text, both separator lines,
divider through the header row, two lanes labeled User/System.

## Output / cleanup
- Final deliverable: `activity-<name>.png`.
- Keep `.puml` + `frame_activity.py` for re-generation.
- `plantuml.jar` is shared by all figures (also used for use-case diagrams).

## Reference example already built
- `activity-submit.puml` + `activity-submit.png` — the **Submit code / Submit
  solution** use case. Copy it as the template for new diagrams.

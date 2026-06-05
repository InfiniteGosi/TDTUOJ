# Generates an editable draw.io (mxGraph XML) use-case diagram for TDTUOJ.
import html

ACTOR_STYLE = "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;"
UC_STYLE    = "ellipse;whiteSpace=wrap;html=1;fillColor=#FDFDFD;strokeColor=#555555;"
ASSOC       = "endArrow=none;html=1;strokeColor=#333333;"
GEN         = "endArrow=block;endFill=0;html=1;strokeColor=#2E5C8A;"          # generalization (hollow triangle)
DASH        = "endArrow=open;dashed=1;html=1;strokeColor=#666666;"           # include/extend

cells = []
_id = [1]
def nid():
    _id[0] += 1
    return f"n{_id[0]}"

def node(label, x, y, w, h, style):
    i = nid()
    cells.append(
        f'<mxCell id="{i}" value="{html.escape(label)}" style="{style}" vertex="1" parent="1">'
        f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'
    )
    return i

def edge(src, dst, style, label=""):
    i = nid()
    cells.append(
        f'<mxCell id="{i}" value="{html.escape(label)}" style="{style}" edge="1" parent="1" source="{src}" target="{dst}">'
        f'<mxGeometry relative="1" as="geometry"/></mxCell>'
    )

# ---------------- Actors ----------------
AW, AH = 40, 80
user    = node("User",            20,  640, AW, AH, ACTOR_STYLE)
creator = node("Contest creator", 20, 1500, AW, AH, ACTOR_STYLE)
admin   = node("Admin",           20, 2180, AW, AH, ACTOR_STYLE)
llm     = node("LLM",             1500, 360, AW, AH, ACTOR_STYLE)
aiparse = node("AI parser service", 1500, 1640, AW, AH, ACTOR_STYLE)
judge   = node("Judging service",   1500, 1900, AW, AH, ACTOR_STYLE)

UW, UH = 190, 50
def col(items, x, y0, step=70):
    ids = {}
    y = y0
    for key, label in items:
        ids[key] = node(label, x, y, UW, UH, UC_STYLE)
        y += step
    return ids

# ---------------- User use cases (col 1) ----------------
user_ucs = col([
    ("login","Login"),
    ("register","Register"),
    ("editprofile","Edit profile"),
    ("changepwd","Change password"),
    ("avatar","Upload avatar"),
    ("viewproblems","View problems"),
    ("viewcontests","View contests"),
    ("viewcontestlb","View leaderboard in contests"),
    ("viewuserslb","View users leaderboard"),
    ("viewprofile","View user profile"),
    ("joinorg","Join organization"),
    ("submit","Submit solution"),
    ("viewsubs","View submission history"),
    ("subdetail","View submission detail"),
    ("participate","Participate in contests"),
    ("regcontest","Register for contest"),
    ("visualize","Visualize and debug code"),
    ("hints","Give problem hints"),
    ("explain","Explain code and errors"),
    ("complexity","Analyze code complexity"),
    ("addcomment","Add comment on problem"),
    ("reply","Reply to comment"),
    ("editcomment","Edit comment on problem"),
    ("delcomment","Delete comment on problem"),
    ("upvote","Upvote comment"),
    ("downvote","Downvote comment"),
    ("addfav","Add problem to favorite list"),
    ("remfav","Remove problem from favorite list"),
    ("viewlab","View lab"),
    ("submitlab","Submit lab exercise"),
], 320, 40, 70)

# ---------------- Creator use cases (col 2) ----------------
creator_ucs = col([
    ("createproblem","Create problem"),
    ("updateproblem","Update problem"),
    ("deleteproblem","Delete problem"),
    ("addtag","Add problem tag"),
    ("managetc","Manage test cases"),
    ("pdf","Upload problem from PDF"),
    ("gentc","Generate test cases"),
    ("evaluate","Evaluate submission"),
    ("createcontest","Create contest"),
    ("updatecontest","Update contest"),
    ("monitorcontest","Monitor contest"),
    ("publishcontest","Publish contest result"),
    ("approvereg","Approve contest registration"),
    ("createorg","Create organization"),
    ("updateorg","Update organization"),
    ("deleteorg","Delete organization"),
    ("addusers","Add users to organization"),
    ("promote","Promote user in organization"),
    ("demote","De-promote user in organization"),
    ("createlab","Create lab"),
    ("updatelab","Update lab"),
    ("deletelab","Delete lab"),
    ("labprogress","View lab progress"),
], 760, 760, 70)

# ---------------- Admin use cases (col 3) ----------------
admin_ucs = col([
    ("managetags","Manage problem tags"),
    ("disableuser","Disable user"),
    ("updateuser","Update user information"),
], 760, 2150, 70)

# ---------------- Associations ----------------
for k in user_ucs:    edge(user, user_ucs[k], ASSOC)
for k in creator_ucs: edge(creator, creator_ucs[k], ASSOC)
for k in admin_ucs:   edge(admin, admin_ucs[k], ASSOC)

# Role generalizations
edge(creator, user, GEN)
edge(admin, creator, GEN)

# AI / LLM user use cases
edge(user_ucs["hints"], llm, ASSOC)
edge(user_ucs["explain"], llm, ASSOC)
edge(user_ucs["complexity"], llm, ASSOC)

# Service actors
edge(creator_ucs["pdf"], aiparse, ASSOC)
edge(creator_ucs["gentc"], aiparse, ASSOC)
edge(user_ucs["submit"], judge, ASSOC)
edge(creator_ucs["evaluate"], judge, ASSOC)
edge(user_ucs["submitlab"], judge, ASSOC)

# include / extend
edge(creator_ucs["createproblem"], creator_ucs["addtag"], DASH, "<<include>>")
edge(creator_ucs["createproblem"], creator_ucs["managetc"], DASH, "<<include>>")
edge(creator_ucs["pdf"], creator_ucs["createproblem"], DASH, "<<extend>>")
edge(creator_ucs["gentc"], creator_ucs["managetc"], DASH, "<<extend>>")
edge(user_ucs["participate"], user_ucs["submit"], DASH, "<<include>>")
edge(user_ucs["participate"], user_ucs["regcontest"], DASH, "<<include>>")
edge(user_ucs["regcontest"], creator_ucs["approvereg"], DASH, "<<extend>>")
edge(user_ucs["submitlab"], user_ucs["submit"], DASH, "<<include>>")
edge(user_ucs["subdetail"], user_ucs["viewsubs"], DASH, "<<extend>>")
edge(user_ucs["reply"], user_ucs["addcomment"], DASH, "<<extend>>")
edge(user_ucs["visualize"], user_ucs["explain"], DASH, "<<extend>>")

xml = (
    '<mxfile host="app.diagrams.net">'
    '<diagram id="usecase" name="TDTUOJ Use Cases">'
    '<mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" '
    'tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" '
    'pageWidth="1700" pageHeight="2400" math="0" shadow="0">'
    '<root>'
    '<mxCell id="0"/><mxCell id="1" parent="0"/>'
    + "".join(cells) +
    '</root></mxGraphModel></diagram></mxfile>'
)

out = r"D:\OJ\Thesis\final\figures\usecase.drawio"
with open(out, "w", encoding="utf-8") as f:
    f.write(xml)
print("Wrote", out, "with", _id[0]-1, "cells")

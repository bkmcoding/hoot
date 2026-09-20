#set page(
  width: 8.5in,
  height: 11in,
  margin: (left: 1in, right: 1in, top: 1in, bottom: 1in),
  fill: rgb("#0b0b0d"),
  numbering: "1",
  number-align: center,
)
#set text(fill: rgb("#e6e6e6"), font: "Liberation Sans", size: 14pt)
#set par(justify: true, leading: 0.8em)

#let accent = rgb("#9ca3af")
#let panel = rgb("#17171a")
#let border = rgb("#2b2b30")
#let hwhite = rgb("#f5f5f5")

#let sect(num, title) = block[
  #v(24pt)
  #text(size: 16pt, weight: "bold", fill: hwhite, tracking: 1.2pt)[#num. #upper(title)]
  #v(12pt)
]

// ---- Title ----
#block(align(center)[
  #text(size: 26pt, weight: "bold", fill: hwhite)[Hoot: Project Plan]
  #v(8pt)
  #text(size: 14pt, style: "italic", fill: accent)[Predictive Household Inventory Tracker]
])

#v(20pt)

#sect("1", "Project Idea")

Every household runs on a small set of items that quietly get consumed and need to be replaced. Hoot is a predictive household inventory tracker designed to eliminate the need for manual shopping lists. Rather than asking the user to write down what they need, Hoot logs what gets bought and when, learning the interval between purchases for each item. It then surfaces a running prediction of what needs to be restocked and roughly when. 

#sect("2", "Project Description")

At its core, Hoot allows users to register household items, log purchases, and view a dashboard of tracked items ranked by how soon they are expected to run out. By treating an item's purchase history as a small time series, the system mathematically projects forward to estimate the next likely purchase date based on previous shopping habits. This keeps the system transparent and allows estimates to adjust automatically over time.

#sect("3", "Developing Environment")

The project will be developed locally using VS Code as the primary editor. The database utilized for this system is PostgreSQL. The backend I currently plan on using is ASP.NET Core with a REST API and a classic HTML + JS frontend to interact with the API.

#pagebreak()

#v(20pt)
#sect("4", "User Interface Prototype")
Below is a visual prototype of the dashboard a logged-in user would see. The UI features a timeline interval indicator for each item, representing the predicted time window before a restock is required, based on historical purchase data.

#v(10pt)
#align(center)[
  // Main Application Window
  #box(fill: rgb("#1e1e1e"), stroke: rgb("#333333") + 1pt, radius: 8pt, width: 95%, inset: 0pt)[
    
    // Apply a local serif font to match the image design
    #set text(font: ("Linux Libertine", "Times New Roman", "serif"), fill: rgb("#d4d4d4"))
    
    // Top Navigation / Header
    #box(width: 100%, inset: (top: 16pt, bottom: 12pt, left: 16pt, right: 16pt))[
      #grid(columns: (1fr, 1fr, 1fr), align: horizon)[
      ][
        #align(center)[#text(size: 15pt, weight: "bold", fill: rgb("#ffffff"))[🦉 Hoot]]
      ][
        #align(right)[#text(size: 10pt, fill: rgb("#a3a3a3"))[Welcome, Michael]]
      ]
    ]
    
    // Dashboard Content Area
    #box(inset: (x: 16pt, bottom: 20pt))[
      #align(left)[#text(size: 13pt, weight: "bold", fill: rgb("#ffffff"))[Upcoming Restocks]]
      #v(14pt)
      
      // Milk Row
      #box(fill: rgb("#2b2b2d"), width: 100%, radius: 6pt, inset: 12pt)[
        #grid(columns: (1.5fr, 3fr, 1fr), align: horizon)[
          #align(left)[
            #text(size: 12pt, weight: "bold", fill: rgb("#ffffff"))[Milk] \
            #v(4pt)
            #text(size: 9pt, fill: rgb("#8b8b8b"))[Pantry]
          ]
        ][
          // Floating Timeline Indicator
          #align(center)[
            #box(width: 80%, height: 6pt, radius: 3pt, fill: rgb("#3a3a3a"))[
              #place(left, dx: 45%, dy: 0%)[
                #box(width: 12%, height: 100%, radius: 3pt, fill: rgb("#689d99"))
              ]
            ]
          ]
        ][
          #align(right)[#text(size: 10pt, weight: "bold", fill: rgb("#689d99"))[2 days]]
        ]
      ]
      #v(8pt)
      
      // Eggs Row
      #box(fill: rgb("#2b2b2d"), width: 100%, radius: 6pt, inset: 12pt)[
        #grid(columns: (1.5fr, 3fr, 1fr), align: horizon)[
          #align(left)[
            #text(size: 12pt, weight: "bold", fill: rgb("#ffffff"))[Eggs] \
            #v(4pt)
            #text(size: 9pt, fill: rgb("#8b8b8b"))[Pantry]
          ]
        ][
          #align(center)[
            #box(width: 80%, height: 6pt, radius: 3pt, fill: rgb("#3a3a3a"))[
              #place(left, dx: 38%, dy: 0%)[
                #box(width: 28%, height: 100%, radius: 3pt, fill: rgb("#a4a7cf"))
              ]
            ]
          ]
        ][
          #align(right)[#text(size: 10pt, weight: "bold", fill: rgb("#a4a7cf"))[5 days]]
        ]
      ]
      #v(8pt)
      
      // Paper Towels Row
      #box(fill: rgb("#2b2b2d"), width: 100%, radius: 6pt, inset: 12pt)[
        #grid(columns: (1.5fr, 3fr, 1fr), align: horizon)[
          #align(left)[
            #text(size: 12pt, weight: "bold", fill: rgb("#ffffff"))[Paper Towels] \
            #v(4pt)
            #text(size: 9pt, fill: rgb("#8b8b8b"))[Cleaning]
          ]
        ][
          #align(center)[
            #box(width: 80%, height: 6pt, radius: 3pt, fill: rgb("#3a3a3a"))[
              #place(left, dx: 25%, dy: 0%)[
                #box(width: 45%, height: 100%, radius: 3pt, fill: rgb("#c697b8"))
              ]
            ]
          ]
        ][
          #align(right)[#text(size: 10pt, weight: "bold", fill: rgb("#c697b8"))[9 days]]
        ]
      ]
      
      #v(20pt)
      
      // Action Buttons
      #grid(columns: (auto, auto, 1fr), gutter: 12pt)[
        #box(fill: rgb("#857b61"), inset: (x: 16pt, y: 10pt), radius: 4pt)[
          #text(size: 10pt, weight: "bold", fill: rgb("#ffffff"))[1. Add Item]
        ]
        #box(fill: rgb("#47474a"), inset: (x: 16pt, y: 10pt), radius: 4pt)[
          #text(size: 10pt, fill: rgb("#ffffff"))[1. One-Time Purchase]
        ]
      ]
    ]
  ]
]

#sect("5", "Data Source")

Hoot does not rely on any external datasets. Every row of data within the system is generated directly by the user simply using the app day to day. The user provides the initial item creation and logs consecutive purchases to build the data history necessary for the system's predictions.
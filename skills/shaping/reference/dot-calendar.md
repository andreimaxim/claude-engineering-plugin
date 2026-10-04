# The Dot Grid Calendar

Read this when a broad feature request needs narrowing, or when deciding how much visual detail
belongs in a shape.

## Find the situation behind the feature name

Basecamp 3 had an agenda-style schedule: a list of events, without a calendar grid. Customers asked
for a calendar, but that name left many possible features unresolved.

The team asked one customer what she had been doing when she wanted a calendar. Her office kept
meeting-room bookings on a wall calendar. While working from home, she received a client's request
for a meeting and drove to the office to check availability. After the trip, she found no suitable
opening. The useful outcome was seeing free spaces remotely, not reproducing every calendar feature.

The existing agenda made scheduled events visible but not the gaps between them. That was a
specific baseline against which to judge a solution.

## Fit the elements to the appetite

In the book, the team was willing to spend one six-week cycle on an improvement, not months on a
full calendar. That was the appetite for this historical example, not a default time budget for
other projects. In this skill, establish how much change the user is willing to take on. Use a time
budget when one is supplied.

The resulting concept had three connected elements:

- A read-only grid showing two months.
- A dot for each event on a day, making empty days visible too.
- An agenda below the grid. Selecting a day with events scrolls its events into view.

The team deliberately excluded dragging events between days, resizing events, color categories,
and separate daily or weekly views. Multi-day events would repeat dots rather than span cells with
bars. Those choices reduced the work while preserving the narrowed use case.

## Show the relationship, not the finished design

The spatial relationship between the grid and agenda was part of the idea. A fat-marker sketch
could show those regions and the dots without selecting typography, spacing, colors, or polished
controls. See the [original rough sketch](https://basecamp.com/assets/images/books/shapeup/1.1/calendar_sketch.png).

The sketch was concrete about the interaction and visibly unfinished about its presentation.
Designers could interpret the visual design, and programmers could choose the implementation.
Neither had to discover what kind of calendar the project was supposed to be.

Use the case to ask what smaller set of elements would improve the actual situation. Do not assume
that every calendar request is about free spaces, or that the same exclusions fit another product.
The customer story justified these trade-offs. The feature's name alone did not.

Sources: [Principles of Shaping](https://basecamp.com/shapeup/1.1-chapter-02),
[Set Boundaries](https://basecamp.com/shapeup/1.2-chapter-03), and
[Find the Elements](https://basecamp.com/shapeup/1.3-chapter-04).

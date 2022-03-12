Super search engine component!

tier 1

-   search box basic searching
    -   hero names
    -   item names

tier 2

-   filters
    -   role
    -   hero
    -   base points (uniform point system to measure delta between data sample and segment)

Functions like a subcomponent that filters and as a result generates
inputs, probably T[] and this goes into another component for example:

{
type: hero | item
data: StringFormatName[],
}

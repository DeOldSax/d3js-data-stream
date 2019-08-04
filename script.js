const url = "data.json"
const rootSelector = "#myPlot"

d3.json(url).then(input => {
    const allMargin = 50
    const margin = {top: 40, right: allMargin, bottom: 60, left: 70}
    const clientWidth = d3.select(rootSelector).node().getBoundingClientRect().width
    const clientHeight = d3.select(rootSelector).node().getBoundingClientRect().height

    const width = clientWidth - margin.left - margin.right
    const height = clientHeight - margin.top - margin.bottom

    d3.select(rootSelector).attr("style", "background:black")

    let svg = d3.select(rootSelector).append("svg")
        .attr("width", clientWidth)
        .attr("height", clientHeight)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`)

    const detailStreamPlot = new StreamPlot(input.data, width, height * 0.7, 7, 0, false)
    detailStreamPlot.plot(svg)
    detailStreamPlot.enableMetaInfo()

    const overviewStreamPlot = new StreamPlot(input.data, width, height * 0.2, 4, height * 0.85, true)
    overviewStreamPlot.plot(svg)
    overviewStreamPlot.enableBrush()
})

function updatePlot() {
    const extent = d3.event.selection
    const startX = extent[0][0]
    const endX = extent[1][0]
}

class StreamPlot {
    constructor(data, width, height, dotRadius, topMargin) {
        this.data = data
        this.width = width
        this.height = height
        this.ids = this.extractUnique(record => record[0])
        this.categories = this.extractUnique(record => record[1])
        this.dotRadius = dotRadius
        this.topMargin = topMargin

        this.dots = null
        this.infobox = d3.select("body").append("div").attr("id", "infobox")
        this.rootG = null
    }

    enableMetaInfo() {
        const self = this

        this.dots
            .on("mouseover", function(record) {
                const id = record[0]

                const coords = d3.mouse(this)
                const leftValue = `${coords[0] + 50}px`
                const topValue = `${coords[1] + 80}px;visibility:visible`
                const date = new Date(parseInt(record[2]))
            
                self.infobox
                    .attr("style", `left:${leftValue};top:${topValue}`)
                    .html(`${record[0]}-${record[1]}-${date}`)

                self.dots
                    .attr("style", record => record[0] === id
                        ? "visibility:visible"
                        : "opacity:0.2")

            })
            .on("mouseout", function() {
                self.infobox.attr("style", "visibility:hidden")
                self.dots.attr("style", "visibility:visible;opacity:1")
            })
    }

    enableBrush() {
        this.rootG
            .call(d3.brushX()                   
                .extent([ [0,-10], [this.width, this.height] ])
                //.on("start end", updatePlot)
            )
    }

    extractUnique(f) {
        return [...new Set(this.data.map(f))].sort()
    }

    plot(svg) {
        this.rootG = svg.append("g")
            .attr("class", "streamplot")
            .attr("height", this.height)
            .attr("width", this.width)    
            .attr("transform", `translate(0, ${this.topMargin})`)

        const id2ColorScale = d3.scaleLinear()
            .domain([0, this.ids.length])
            .range([0, 1])
    
        const yScale =  d3.scalePoint()
            .domain(this.categories)
            .range([0, this.height])
    
        const xScale = d3.scaleTime()
            .domain(d3.extent(this.data, record => record[2]))
            .range([0, this.width])
    
        const xAxis = d3.axisBottom(xScale)
            .ticks(10)
            .tickFormat(d3.timeFormat("%b,%Y"))
    
        const yAxis = d3.axisLeft(yScale)
            .tickValues(yScale.domain())
    
        this.rootG.append("g")
            .attr("class", "x axis")
            .attr("transform", `translate(0, ${this.height})`)
            .call(xAxis)
    
        this.rootG.append("g")
            .attr("class", "y axis")
            .call(yAxis)
    
        this.dots = this.rootG.selectAll(".dot")
            .data(this.data)
        .enter().append("circle")
            .attr("class", "dot")
            .attr("fill", record => d3.interpolateSpectral(id2ColorScale(this.ids.indexOf(record[0]))))
            .attr("cx", record => xScale(record[2]))
            .attr("cy", record => yScale(record[1]))
            .attr("r", this.dotRadius)
    }
}

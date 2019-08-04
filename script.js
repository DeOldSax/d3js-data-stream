const url = "data.json"
const rootSelector = "#myPlot"

d3.json(url).then(input => {
    const allMargin = 50
    const margin = {top: 40, right: allMargin, bottom: 60, left: 70}

    const clientRect = d3.select(rootSelector).node().getBoundingClientRect()
    const clientWidth = clientRect.width
    const clientHeight = clientRect.height

    const width = clientWidth - margin.left - margin.right
    const height = clientHeight - margin.top - margin.bottom

    d3.select(rootSelector).attr("style", "background:#111")

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
    overviewStreamPlot.onBrushed((selection) => detailStreamPlot.updatePlot(selection))
})

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
        this.xAxis = null
        this.xAxisG = null
        this.xScale = null
        this.originalXScale = null
        this.yScale = null

        this.onBrushedCallback = null
    }

    onBrushed(f) {
        this.onBrushedCallback = f
    }

    updatePlot(selection) {
        const focusedExtent = selection.map(this.originalXScale.invert)
        this.xScale.domain(focusedExtent).nice()

        this.xAxisG
            .call(this.xAxis)

        this.dots
            .attr("cx", record => this.xScale(record[2]))
            .attr("cy", record => this.yScale(record[1]))
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
                    .html(`[${record[0]}] ${record[1]}-${date}`)

                self.dots
                    .transition()
                    .duration(200)
                    .attr("style", record => record[0] === id
                        ? "visibility:visible"
                        : "opacity:0.2")
                    .attr("r", record => record[0] == id
                        ? self.dotRadius + 1
                        : self.dotRadius - 1)
                    .attr("stroke-width", record => record[0] == id ? 2 : 1)
                    .attr("stroke", record => record[0] == id ? "white" : "black")

            })
            .on("mouseout", function() {
                self.infobox.attr("style", "visibility:hidden")
                self.dots
                    .transition()
                    .duration(200)
                    .attr("style", "visibility:visible;opacity:1")
                    .attr("r", self.dotRadius)
                    .attr("stroke-width", 1)
                    .attr("stroke", "black")
            })
    }

    enableBrush() {
        this.rootG
            .call(d3.brushX()                   
                .extent([ [0,-10], [this.width, this.height] ])
                .on("brush end", () => {
                    const selection = d3.event.selection || this.xScale.range()
                    this.onBrushedCallback(selection)
                })
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
    
        this.yScale =  d3.scalePoint()
            .domain(this.categories)
            .range([0, this.height])
    
        this.xScale = d3.scaleTime()
            .domain(d3.extent(this.data, record => record[2]))
            .range([0, this.width])
            .nice()

        this.originalXScale = this.xScale.copy()
    
        this.xAxis = d3.axisBottom(this.xScale)
            .ticks(10)
            .tickFormat(d3.timeFormat("%b,%Y"))
    
        const yAxis = d3.axisLeft(this.yScale)
            .tickValues(this.yScale.domain())
    
        this.xAxisG = this.rootG.append("g")
            .attr("class", "x axis")
            .attr("transform", `translate(0, ${this.height})`)
            .call(this.xAxis)

        const strokeWidth = 2
        const clipMargin = this.dotRadius + strokeWidth

        const clip = svg.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("width", this.width - 2)
            .attr("height", this.height + clipMargin * 2)
            .attr("x", 2)
            .attr("y", -clipMargin);
    
        this.rootG.append("g")
            .attr("class", "y axis")
            .call(yAxis)

        var scatter = this.rootG.append('g')
            .attr("clip-path", "url(#clip)")
    
        this.dots = scatter.selectAll(".dot")
            .data(this.data)
        .enter().append("circle")
            .attr("class", "dot")
            .attr("fill", record => d3.interpolateSpectral(id2ColorScale(this.ids.indexOf(record[0]))))
            .attr("cx", record => this.xScale(record[2]))
            .attr("cy", record => this.yScale(record[1]))
            .attr("r", this.dotRadius)
            .attr("stroke-width", 1)
            .attr("stroke", "black")
    }
}

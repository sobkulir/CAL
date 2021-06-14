function applyRule(syms, rules) {
  let result = null
  for (const pair of rules) {
    const x = Object.keys(pair)[0]
    let ok = true
    for (let i = 0; i < 3; ++i) {
      if (syms[i] != x[i] && x[i] != '.') ok = false
    }
    if (ok) {
      result = pair[x].toString()
      break
    }
  }
  if (!result) return ["No rule to apply for " + syms + " in " + rules, null]
  return [null, result]
}

function executeSingle(tape, rules) {
  let out = tape.slice()
  out[0] = "0"
  out[1] = "0"
  for (let i = 2; i < tape.length; ++i) {
    let toApply = null
    for (const rule of rules.rules) {
      if (parseInt(rule.start) > i || i > parseInt(rule.end)) continue
      if (toApply != null) {
        return ["Multiple rules to apply for " + i, null]
      }
      toApply = rule.name
    }
    if (!toApply) return ["No rules to apply for " + i, null]
    if (!rules[toApply]) return ["No rule " + toApply, null]
    const [error, res] = applyRule(tape.slice(i - 2, i + 1), rules[toApply])
    if (error) return [error, null]
    out[i] = res
  }
  return [null, out]
}

function executeRules(parsedRules) {
  if (!parsedRules.initial) return ["Provide initial value", null]
  const history = [parsedRules.initial.toString().split('')]

  for (let i = 0; i < 20; ++i) {
    const [error, newTape] = executeSingle(history[history.length - 1], parsedRules)
    if (error) return [error, null]
    history.push(newTape)
  }
  return [null, history]
}

class CAL extends React.Component {
  constructor(props) {
    super(props)
    let rules = localStorage.getItem(props.name)
    if (!rules) {
      rules = props.defaultRules
    }
    this.state = {
      header: [],
      history: [],
      error: "",
      tabName: props.name,
      rules: rules,
    }
  }

  UNSAFE_componentWillReceiveProps(props) {
    let rules = localStorage.getItem(props.name)
    if (!rules) {
      rules = props.defaultRules
    }
    this.setState({
      header: [],
      history: [],
      error: "",
      tabName: props.name,
      rules: rules,
    })
  }

  rulesChange(value) {
    localStorage.setItem(this.state.tabName, value);
    this.setState({ rules: value })
  }

  renderHeader() {
    return this.state.header.map((val, idx) => (
      <td
        key={"head" + idx}
        colSpan={val.span}
        className="header-cell"
      >
        {val.name}
      </td>
    ))
  }

  renderHistory() {
    const getColor = (val) => {
      return (!this.colors || !this.colors[val]) ? "white" : this.colors[val]
    }

    return this.state.history.map((row, rowIdx) => (
      <tr key={"row" + rowIdx}>
        {row.map((val, colIdx) => (
          <td
            key={"tape" + colIdx}
            style={{
              backgroundColor: getColor(val)
            }}
            className="input-cell">{val}</td>
        ))}
      </tr>
    ))
  }

  execute() {
    let parsed = null, error = null, history = []
    try {
      parsed = jsyaml.load(this.state.rules)
    } catch (err) {
      error = err
    }
    if (error || !parsed) {
      this.setState({ error: error })
      return
    }

    [error, history] = executeRules(parsed)
    if (error) {
      this.setState({ error: error })
      return
    }
    this.colors = parsed.colors

    parsed.rules.sort((lhs, rhs) => lhs.start < rhs.start)
    let header = []
    for (const rule of parsed.rules) {
      header.push({ span: rule.end - rule.start + 1, name: rule.name })
    }

    this.setState({ history: history, error: "", header: header })
  }

  render() {
    const error = (this.state.error == null) ? "" : this.state.error

    return (
      <div>
        <textarea
          value={this.state.rules}
          onChange={(event) => this.rulesChange(event.target.value)}
          rows="20"
          cols="100" />
        <br />
        <button className="runButton" onClick={() => this.execute()}>Run</button>
        <div style={{ color: "red" }}>{error}</div>
        <table className="state-table">
          <thead className="table-head">
            <tr>{this.renderHeader()}</tr>
          </thead>
          <tbody className="table-body">
            {this.renderHistory()}
          </tbody>
        </table>
      </div>
    );
  }
}

class Tabs extends React.Component {
  constructor(props) {
    super(props)
    this.setup = props.setup
    this.state = {
      activeIdx: 0
    }
  }

  renderButtons() {
    return this.setup.map((val, idx) => (
      <button
        key={"tab" + idx}
        className={`tabButton ${this.state.activeIdx == idx ? 'active' : ''}`}
        onClick={() => this.setState({ activeIdx: idx })}
      >
        {val.name}
      </button>
    ))
  }

  render() {
    const activeTab = this.setup[this.state.activeIdx]
    return (
      <div>
        <div>{this.renderButtons()}</div>
        <CAL name={activeTab.name} defaultRules={activeTab.rules} />
      </div>
    )
  }
}

const TABS_SETUP = [
  {
    name: "Addition",
    rules: `# Expects two bit-serial LSb-first interleaved binary numbers
# Outputs sum of the numbers

# 10011 (19) + 11011 (27) = (101110) 46
initial: "11010011110000000000000000"

# 10101 (31) + 10101 (31) = (101100) 62
# initial: "11010010110000000000000000"

colors:
  1: grey
  X: orange

move1: [
  ".1.": 1,
  ".0.": 0,
]

move2: [
  "1..": 1,
  "0..": 0,
]

Swap: [
  "00.": 0,
  "01.": X,
  "10.": X,
  "11.": 1,
]

OP1: [
  ".0.": 0,
  ".X.": 1,
  ".1.": 1,
]

OP2: [
  "0..": 0,
  "X..": 0,
  "1..": 1,
]

Sum: [
  "00X": 1,
  "00.": 0,
  "10X": X,
  "10.": 1,
  "11.": X,
]

Hint: [
  "1X.": 1,
  "...": 0,
]

Result: [
  "X1.": 1,
  "X0.": 0,
  "1..": 1,
  "0..": 0,
]

rules:
  - {
    start: 0,
    end: 9,
    name: move2
  }
  - {
    start: 10,
    end: 10,
    name: Swap
  }
  - {
    start: 11,
    end: 11,
    name: OP1
  }
  - {
    start: 12,
    end: 12,
    name: OP2
  }
  - {
    start: 13,
    end: 13,
    name: Sum
  }
  - {
    start: 14,
    end: 14,
    name: Hint
  }
  - {
    start: 15,
    end: 15,
    name: Result
  }
  - {
    start: 16,
    end: 25,
    name: move1
  }
    `
  },
  {
    name: "Tournament_reduce",
    rules: `initial: "XX01011011XXXXXXXXXXX"
colors:
  1: grey
  X: orange

Move1: [
  ".1.": 1,
  ".0.": 0,
  ".X.": X,
]

Move2: [
  "1..": 1,
  "0..": 0,
  "X..": X,
]

XGen: [
  "...": X,
]

And: [
  "11.": 1,
  ".0.": 0,
  "0..": 0,
  "...": X
]

Or: [
  ".X.": X,
  ".1.": 1,
  "1..": 1,
  "...": 0,
]

Xor: [
  ".X.": X,
  "X..": X,
  "11.": 0,
  "00.": 0,
  "...": 1,
]

OP1: [
  ".1.": 1,
  ".0.": 0,
  ".X.": X,
]

OP2: [
  ".1X": 1,
  ".0X": 0,
  ".X1": 1,
  ".X0": 0,
  "...": X,
]

rules:
  - {
    start: 0,
    end: 3,
    name: XGen
  }
  - {
    start: 4,
    end: 9,
    name: Move2
  }
  - {
    start: 10,
    end: 10,
    name: And
  }
  - {
    start: 11,
    end: 11,
    name: OP1
  }
  - {
    start: 12,
    end: 12,
    name: OP2
  }
  - {
    start: 13,
    end: 13,
    name: Or
  }
  - {
    start: 14,
    end: 14,
    name: OP1
  }
  - {
    start: 15,
    end: 15,
    name: OP2
  }
  - {
    start: 16,
    end: 16,
    name: Xor
  }
  - {
    start: 17,
    end: 25,
    name: Move1
  }`,
  },
  {
    name: "01_Counter",
    rules: `initial: "XX10110110X0X0X0X"

colors:
  1: grey
  X: orange

Move1: [
  ".1.": 1,
  ".0.": 0,
  ".X.": X,
]

XGen: [
  "...": X,
]

Res: [
  ".11": 0,
  ".10": 1,
  ".01": 0,
  ".00": 1,
  "..0": 0,
  "..1": 1,
]

Carry: [
  "11.": 1,
  "10.": X,
  "01.": X,
  "00.": 0,
  "...": X,
]

rules:
  - {
    start: 0,
    end: 2,
    name: XGen
  }
  - {
    start: 3,
    end: 8,
    name: Move1
  }
  - {
    start: 9,
    end: 9,
    name: Res
  }
  - {
    start: 10,
    end: 10,
    name: Carry
  }
  - {
    start: 11,
    end: 11,
    name: Res
  }
  - {
    start: 12,
    end: 12,
    name: Carry
  }
  - {
    start: 13,
    end: 13,
    name: Res
  }
  - {
    start: 14,
    end: 14,
    name: Carry
  }
  - {
    start: 15,
    end: 15,
    name: Res
  }
  - {
    start: 16,
    end: 16,
    name: Carry
  }`
  }
]
ReactDOM.render(
  <Tabs setup={TABS_SETUP} />
  , document.getElementById('app'));
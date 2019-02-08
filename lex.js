function linewise (src) {
  const single_line = src
    .split('\n')                        // split up lines
    .filter(l => /\S/.exec(l) !== null) // delete blank lines
    .map(eat_spaces)                    // remove leading spaces
    .filter(l => l[0] !== ';')          // delete commented ones
    .join(' ')                          // join lines without returns

  return lex(single_line)
}

// TODO: detect imbalanced parens by analysis ahead of time
function lex (src, dst=[], depth=0) {
  if (src === '') return dst

  const hint = src[0]

  // ignore spaces
  if (hint === ' ') {
    return lex(eat_spaces(src), dst, depth + 1)
  }

  // push/pop
  if (hint === '(' || hint === '[') {
    const [ remainder, subterm ] = lex(src.substr(1), [], depth + 1)
    return lex(remainder, dst.concat([ subterm ]), depth + 1)
  } else if (hint === ')' || hint === ']') {
    return [ src.substr(1), dst ]
  }

  // data
  if (hint === '"') {
    const [ string, remainder ] = lex_string(src)
    return lex(remainder, dst.concat([ string ]), depth + 1)
  } else {
    const [ atm, remainder ] = lex_atom(src)
    return lex(remainder, dst.concat([ atm ]), depth + 1)
  }
}

function lex_string (src) {
  const no_lquote = src.substr(1)
  const rquote_re_result = /"/.exec(no_lquote)
  if (rquote_re_result === null) throw new Error(`non-terminated string`)
  const body_length = rquote_re_result.index
  const string_length = body_length + 2 // add back the quotes
  return [ src.slice(0, string_length), src.substr(string_length) ]
}

function lex_atom (src) {
  const space_re_result = /\s|\)|\]/.exec(src)
  const end_index = space_re_result != null ? space_re_result.index : src.length
  return [ src.slice(0, end_index), src.substr(end_index) ]
}

function eat_spaces (src) {
  const nonspace_index = /\S/.exec(src).index
  return src.substr(nonspace_index)
}

export default linewise

export function test (suite) {
  suite(`test`, [
    t => t.eq(eat_spaces('    a'))('a'),
    t => t.eq(lex_atom('apple'))([ 'apple', '' ]),
    t => t.eq(lex_string('"hi there"'))([ '"hi there"', '' ]),
    t => t.eq(lex_atom('512.16'))([ '512.16', '' ]),
    t => t.eq(lex_atom('apple banana strawberry'))([ 'apple', ' banana strawberry' ]),
    t => t.eq(lex_atom('(hello 5 )'))([ '(hello', ' 5 )' ]),
    t => t.eq(lex(' )'))([ '', [] ]),
    t => t.eq(lex('(sexp [5 "hello"] (atom a "b" 3 (deeper 14 again)) continues)'))
             ([[ 'sexp', [ '5', '"hello"' ], [ 'atom', 'a', '"b"', '3', [ 'deeper', '14', 'again' ] ], 'continues' ]]),
    t => t.eq(lex('55'))([ '55' ]),
    t => t.eq(lex('123 "abc" hi'))([ '123', '"abc"', 'hi' ]),
    t => t.eq(lex('"(this expression is quoted)()(([)"'))
            (['"(this expression is quoted)()(([)"']),
    t => t.eq(linewise(`(form [] (text [] "hello, kitten")
                                (list [] [(text [] "hello, kitten") (number [] 14)])
                                (number [] 14)
                                (media [application/octet-stream] "0x47ba1399")
                                (group [] (text [] "hello, kitten")))`))
            ([[ 'form', [], [ 'text', [], '"hello, kitten"' ],
                           [ 'list', [], [[ 'text', [], '"hello, kitten"' ],
                                          [ 'number', [], '14' ]] ],
                           [ 'number', [], '14' ],
                           [ 'media', [ 'application/octet-stream' ], '"0x47ba1399"' ],
                           [ 'group', [], [ 'text', [], '"hello, kitten"' ] ]]])
  ])
}

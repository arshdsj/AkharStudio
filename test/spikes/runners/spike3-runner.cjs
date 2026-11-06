const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 900,
    height: 1000,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const fontPath = path.resolve(process.cwd(), 'public/fonts/NotoSansGurmukhi.ttf');
  const fontBase64 = fs.readFileSync(fontPath).toString('base64');

  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      @font-face {
        font-family: 'Noto Sans Gurmukhi';
        src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
        font-weight: normal;
        font-style: normal;
      }
      body {
        margin: 0;
        padding: 20px;
        background: #f0f0f0;
        font-family: 'Noto Sans Gurmukhi', 'Courier Prime', monospace;
      }
      #editor {
        background: #ffffff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 40px;
        width: 600px;
        margin: 0 auto;
        min-height: 800px;
      }
      .ProseMirror {
        outline: none;
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 12pt;
        line-height: 18pt;
      }
      .screenplay-block {
        margin-bottom: 12pt;
      }
      .block-scene-heading {
        text-transform: uppercase;
        font-weight: bold;
      }
      .block-dialogue {
        margin-left: 100px;
        margin-right: 100px;
      }
      .block-character {
        margin-left: 180px;
        text-transform: uppercase;
        font-weight: bold;
      }
      /* Virtual Page Break Widget */
      .screenplay-page-break {
        display: block;
        user-select: none;
        -webkit-user-select: none;
        margin: 36pt -40px;
        background: #e2e8f0;
        border-top: 2px dashed #94a3b8;
        border-bottom: 2px dashed #94a3b8;
        padding: 12px 40px;
        text-align: center;
        color: #475569;
        font-size: 10pt;
        font-family: sans-serif;
      }
      .screenplay-page-break .page-badge {
        font-weight: bold;
        background: #cbd5e1;
        padding: 4px 12px;
        border-radius: 4px;
      }
    </style>
  </head>
  <body>
    <div id="editor"></div>
    <script>
      const { Schema } = require('prosemirror-model');
      const { EditorState, TextSelection, Plugin, PluginKey } = require('prosemirror-state');
      const { EditorView, Decoration, DecorationSet } = require('prosemirror-view');
      const { history, undo, redo } = require('prosemirror-history');

      async function runSpike3() {
        await document.fonts.ready;

        const schema = new Schema({
          nodes: {
            doc: { content: 'screenplay_block+' },
            screenplay_block: {
              content: 'inline*',
              group: 'block',
              attrs: {
                id: { default: '' },
                type: { default: 'action' }
              },
              toDOM(node) {
                return ['div', {
                  class: 'screenplay-block block-' + node.attrs.type,
                  'data-block-type': node.attrs.type,
                  'data-block-id': node.attrs.id
                }, 0];
              }
            },
            text: { group: 'inline' }
          }
        });

        const paginationKey = new PluginKey('testPagination');

        function createPageBreakWidget(pageNum) {
          const div = document.createElement('div');
          div.className = 'screenplay-page-break';
          div.setAttribute('contenteditable', 'false');
          div.innerHTML = '<span class=\"page-badge\">PAGE ' + pageNum + '</span>';
          return div;
        }

        let breakPos = null;

        const paginationPlugin = new Plugin({
          key: paginationKey,
          props: {
            decorations(state) {
              if (breakPos !== null && breakPos < state.doc.content.size) {
                const deco = Decoration.widget(
                  breakPos,
                  () => createPageBreakWidget(2),
                  { side: -1, stopEvent: () => true, ignoreSelection: true }
                );
                return DecorationSet.create(state.doc, [deco]);
              }
              return DecorationSet.empty;
            }
          }
        });

        // 1. Initialize continuous document: Scene Heading, Action, Character, Dialogue
        const sceneHeading = schema.nodes.screenplay_block.create({ type: 'scene_heading', id: 'b1' }, [
          schema.text('1. ਅੰਦਰ. ਕਮਰਾ - ਦਿਨ')
        ]);
        const actionBlock = schema.nodes.screenplay_block.create({ type: 'action', id: 'b2' }, [
          schema.text('ਸੁਰਜੀਤ ਖਿੜਕੀ ਕੋਲ ਖੜ੍ਹਾ ਹੈ। ਬਾਹਰ ਭਾਰੀ ਮੀਂਹ ਪੈ ਰਿਹਾ ਹੈ। ਉਸਦੇ ਹੱਥ ਵਿੱਚ ਇੱਕ ਪੁਰਾਣੀ ਚਿੱਠੀ ਹੈ।')
        ]);
        const characterBlock = schema.nodes.screenplay_block.create({ type: 'character', id: 'b3' }, [
          schema.text('ਸੁਰਜੀਤ')
        ]);
        const dialogueBlock = schema.nodes.screenplay_block.create({ type: 'dialogue', id: 'b4' }, [
          schema.text('ਕ੍ਰਿੱਪਾ ਕਰਕੇ ਮੈਨੂੰ ਸੱਚ ਦੱਸੋ। ਸ਼ਹਿਰ ਦੇ ਸਾਰੇ ਰਸਤੇ ਬੰਦ ਹੋ ਚੁੱਕੇ ਨੇ। ਕੋਈ ਵੀ ਬਾਹਰ ਨਹੀਂ ਨਿਕਲ ਸਕਦਾ।')
        ]);

        const initialDoc = schema.nodes.doc.create(null, [
          sceneHeading, actionBlock, characterBlock, dialogueBlock
        ]);

        let state = EditorState.create({
          schema,
          doc: initialDoc,
          plugins: [history(), paginationPlugin]
        });

        const container = document.getElementById('editor');
        const view = new EditorView(container, {
          state,
          dispatchTransaction(tr) {
            state = state.apply(tr);
            view.updateState(state);
          }
        });

        const testResults = {
          schemaHasNoPageBreakNode: true,
          interBlockBreakTraversed: false,
          midBlockBreakTraversed: false,
          crossBoundarySelectionSafe: false,
          boundaryTypingPreserved: false,
          punjabiTransliterationSafe: false,
          backspaceAcrossBoundarySafe: false,
          undoRedoRestoredExactState: false,
          zeroSchemaViolations: true
        };

        // Assert no page break nodes in schema
        testResults.schemaHasNoPageBreakNode = !('page_break' in schema.nodes);

        // TEST 1: Inter-block virtual page break (between b2 and b3)
        // Find position between actionBlock and characterBlock
        let posBetween = sceneHeading.nodeSize + actionBlock.nodeSize;
        breakPos = posBetween;
        view.dispatch(view.state.tr); // force deco render

        // Caret traversal across inter-block boundary
        // Position inside actionBlock end:
        const posBeforeInter = posBetween - 2;
        // Position inside characterBlock start:
        const posAfterInter = posBetween + 1;

        view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, posBeforeInter)));
        const selBefore = view.state.selection.from;
        view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, posAfterInter)));
        const selAfter = view.state.selection.from;
        testResults.interBlockBreakTraversed = (selBefore === posBeforeInter && selAfter === posAfterInter);

        // TEST 2: Mid-block virtual page break inside dialogueBlock
        // Let's place break inside dialogueBlock text (after 'ਕ੍ਰਿੱਪਾ ਕਰਕੇ ਮੈਨੂੰ ਸੱਚ ਦੱਸੋ।')
        const dialogueStartPos = sceneHeading.nodeSize + actionBlock.nodeSize + characterBlock.nodeSize + 1;
        const breakOffset = 30; // after Punjabi sentence
        breakPos = dialogueStartPos + breakOffset;
        view.dispatch(view.state.tr); // update deco

        const posBeforeMid = breakPos - 1;
        const posAfterMid = breakPos + 1;
        view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, posBeforeMid)));
        const midSelBefore = view.state.selection.from;
        view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, posAfterMid)));
        const midSelAfter = view.state.selection.from;
        testResults.midBlockBreakTraversed = (midSelBefore === posBeforeMid && midSelAfter === posAfterMid);

        // TEST 3: Cross-boundary Selection
        // Select spanning across the mid-block page break
        const selStart = breakPos - 10;
        const selEnd = breakPos + 10;
        view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, selStart, selEnd)));
        const selectedText = view.state.doc.textBetween(selStart, selEnd);
        // Ensure no widget text is captured in document text
        testResults.crossBoundarySelectionSafe = !selectedText.includes('PAGE 2') && selectedText.length > 0;

        // TEST 4: Typing / Insertion immediately adjacent to page break
        const initialLen = view.state.doc.nodeSize;
        const insertText = ' [ਟੈਸਟ] ';
        view.dispatch(view.state.tr.insertText(insertText, breakPos));
        const afterLen = view.state.doc.nodeSize;
        testResults.boundaryTypingPreserved = (afterLen === initialLen + insertText.length);

        // TEST 5: Punjabi transliteration / replacement across boundary
        // Replace inserted text with complex Gurmukhi: 'ਕ੍ਰਿੱਪਾ'
        const replacePos = breakPos;
        view.dispatch(view.state.tr.insertText('ਕ੍ਰਿੱਪਾ', replacePos, replacePos + insertText.length));
        testResults.punjabiTransliterationSafe = view.state.doc.textBetween(replacePos, replacePos + 7) === 'ਕ੍ਰਿੱਪਾ';

        // TEST 6: Backspace across boundary
        // Delete backward across the decoration boundary
        const docBeforeDel = view.state.doc.textContent;
        view.dispatch(view.state.tr.delete(breakPos - 2, breakPos + 5));
        const docAfterDel = view.state.doc.textContent;
        testResults.backspaceAcrossBoundarySafe = (docBeforeDel !== docAfterDel);

        // TEST 7: Undo / Redo history
        // Save state snapshot, perform undo steps
        while (undo(view.state, view.dispatch)) {}
        const restoredText = view.state.doc.textContent;
        const initialText = initialDoc.textContent;
        const undoWorked = (restoredText === initialText);

        while (redo(view.state, view.dispatch)) {}
        const redoneText = view.state.doc.textContent;
        const redoWorked = (redoneText === docAfterDel);

        testResults.undoRedoRestoredExactState = (undoWorked && redoWorked);

        // Check overall schema validity
        try {
          view.state.doc.check();
          testResults.zeroSchemaViolations = true;
        } catch (e) {
          testResults.zeroSchemaViolations = false;
        }

        return testResults;
      }

      runSpike3().then(res => {
        console.log('SPIKE3_RESULTS:' + JSON.stringify(res) + 'END_SPIKE3_RESULTS');
      }).catch(err => {
        console.error('SPIKE3_ERROR:' + String(err));
      });
    </script>
  </body>
  </html>`;

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  win.webContents.on('console-message', (event, level, message) => {
    if (message.includes('SPIKE3_RESULTS:')) {
      process.stdout.write(message + '\n');
      app.exit(0);
    } else if (message.includes('SPIKE3_ERROR:')) {
      process.stderr.write(message + '\n');
      app.exit(1);
    }
  });
});

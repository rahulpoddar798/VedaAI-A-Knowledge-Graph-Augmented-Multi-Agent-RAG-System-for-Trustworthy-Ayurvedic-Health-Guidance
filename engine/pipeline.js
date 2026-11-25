const { StateGraph, END, START } = require('@langchain/langgraph');
const { VedaAIState } = require('./state');
const {
  entityExtractorNode,
  cypherQueryBuilderNode,
  proponentNode,
  opponentNode,
  judgeNode,
  outputFormatterNode
} = require('./agents');

/**
 * Compile the five-stage LLM workflow. The Judge runs for every request so that
 * each response contains an explicit adversarial audit and arbitration result.
 */
function buildVedaAIPipeline() {
  const workflow = new StateGraph(VedaAIState)
    .addNode('entity_extractor', entityExtractorNode)
    .addNode('cypher_builder', cypherQueryBuilderNode)
    .addNode('proponent', proponentNode)
    .addNode('opponent', opponentNode)
    .addNode('judge', judgeNode)
    .addNode('output_formatter', outputFormatterNode)

    // Flow definition
    .addEdge(START, 'entity_extractor')
    .addEdge('entity_extractor', 'cypher_builder')
    .addEdge('cypher_builder', 'proponent')
    .addEdge('proponent', 'opponent')

    .addEdge('opponent', 'judge')
    .addEdge('judge', 'output_formatter')
    .addEdge('output_formatter', END);

  return workflow.compile();
}

// Historical pipeline retained only for reproducible baseline experiments.
module.exports = { buildLegacyPipeline: buildVedaAIPipeline, ...require('./assessment_workflow') };

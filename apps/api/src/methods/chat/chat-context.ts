const _summaryThreshold = 80;
const _recentMessageCount = 20;

export function partitionChatHistory<T>(messages: T[]) {
  if (messages.length < _summaryThreshold) {
    return { messagesToSummarize: [], recentMessages: messages };
  }

  return {
    messagesToSummarize: messages.slice(0, -_recentMessageCount),
    recentMessages: messages.slice(-_recentMessageCount),
  };
}

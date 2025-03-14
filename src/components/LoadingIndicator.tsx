export const LoadingIndicator = () => (
  <div className="px-6 py-6 bg-gradient-to-r from-orange-500/5 to-red-600/5">
    <div className="flex items-start w-full max-w-3xl gap-4 mx-auto">
      <div className="relative flex-shrink-0 w-8 h-8">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 animate-[spin_2s_linear_infinite]"></div>
        <div className="absolute inset-[2px] rounded-lg bg-gray-900 flex items-center justify-center">
          <div className="relative flex items-center justify-center w-full h-full rounded-lg bg-gradient-to-r from-orange-500 to-red-600">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 animate-pulse"></div>
            <span className="relative z-10 text-sm font-medium text-white">
              AI
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-lg font-medium text-gray-400">
          Thinking
        </div>
        <div className="flex gap-2">
          <div
            className="w-2 h-2 rounded-full bg-orange-500 animate-[bounce_0.8s_infinite]"
            style={{ animationDelay: '0ms' }}
          ></div>
          <div
            className="w-2 h-2 rounded-full bg-orange-500 animate-[bounce_0.8s_infinite]"
            style={{ animationDelay: '200ms' }}
          ></div>
          <div
            className="w-2 h-2 rounded-full bg-orange-500 animate-[bounce_0.8s_infinite]"
            style={{ animationDelay: '400ms' }}
          ></div>
        </div>
      </div>
    </div>
  </div>
); 
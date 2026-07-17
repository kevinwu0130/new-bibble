export default function SplitScreen({ left, right }) {
  return (
    <div className="h-screen w-screen flex flex-col md:flex-row overflow-hidden">
      <div className="w-full md:w-1/2 h-1/2 md:h-full overflow-y-auto border-b md:border-b-0 md:border-r border-gray-200">
        {left}
      </div>
      <div className="w-full md:w-1/2 h-1/2 md:h-full overflow-hidden relative">
        {right}
      </div>
    </div>
  )
}

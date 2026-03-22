import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <h1 className="text-4xl font-bold mb-6 text-blue-900">Contract Whist</h1>
        <p className="text-gray-600 mb-8">
          A multiplayer card game of bidding and trick-taking
        </p>
        <a
          href="/game"
          className="inline-block bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors"
        >
          Start Game
        </a>
      </div>
    </div>
  );
}

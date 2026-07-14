// KAN-72: /game (no id) is no longer used — redirect to home.
// All games are now server-side and accessed via /game/[id].
import { redirect } from 'next/navigation';

export default function GamePage() {
  redirect('/');
}

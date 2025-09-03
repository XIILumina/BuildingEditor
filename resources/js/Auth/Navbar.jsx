import { Link } from "react-router-dom";
export default function Navbar() {
    return (
        <nav>
            <ul>
                <li><Link to="/"><button>Home</button></Link></li>
                <li><Link to="/dashboard"><button>Dashboard</button></Link></li>
                <li><Link to="/editor/1"><button>Editor</button></Link></li>
            </ul>
        </nav>
    );
}

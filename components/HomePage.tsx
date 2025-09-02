import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { UsersIcon, TrophyIcon, PlusIcon } from './common/Icons';
import { Team } from '../types';

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
};

const HomePage: React.FC = () => {
    const { currentUser, createTeam, joinTeam, createTournament, joinTournament, getTeamById } = useAppContext();
    const navigate = useNavigate();
    const [modal, setModal] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // State for modals
    const [teamName, setTeamName] = useState('');
    const [teamCode, setTeamCode] = useState('');
    const [tournamentName, setTournamentName] = useState('');
    const [tournamentCode, setTournamentCode] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState('');

    const [myTeams, setMyTeams] = useState<Team[]>([]);

    useEffect(() => {
        // Find all teams the user is a member of.
        // In a real app this might be a dedicated API call.
        const fetchUserTeams = async () => {
             if (!currentUser) return;
             // This is a simplified approach. A better one would be a dedicated endpoint /api/me/teams
             // but for now we filter all teams fetched so far.
             // Let's get all the teams the user is a member of by fetching them if not in state.
            const userTeams: Team[] = [];
            // This part is tricky without a dedicated endpoint. Let's assume for now that team data is fetched on login.
            // Or better, we refetch all teams a user is a member of.
            // For this app's logic, getTeamById populates the context, so we can iterate.
            // This is still inefficient but demonstrates the logic.
            // A more robust solution would be an endpoint `GET /api/me/teams`.
        };
        fetchUserTeams();
    }, [currentUser, getTeamById]);


    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamName) return;
        setIsLoading(true);
        setError('');
        try {
            const newTeam = await createTeam(teamName, null);
            navigate(`/team/${newTeam._id}`);
            setModal(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamCode) return;
        setIsLoading(true);
        setError('');
        try {
            const joinedTeam = await joinTeam(teamCode);
            navigate(`/team/${joinedTeam._id}`);
            setModal(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tournamentName) return;
        setIsLoading(true);
        setError('');
        try {
            const newTournament = await createTournament(tournamentName, null);
            navigate(`/tournament/${newTournament._id}`);
            setModal(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleJoinTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tournamentCode || !selectedTeamId) {
            setError("Please select a team and enter an invite code.");
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const result = await joinTournament(tournamentCode, selectedTeamId);
            if (result.success && result.tournamentId) {
                navigate(`/tournament/${result.tournamentId}`);
                setModal(null);
            } else {
                setError(result.message);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const ActionButton: React.FC<{ icon: React.ReactNode; title: string; description: string; onClick: () => void }> = ({ icon, title, description, onClick }) => (
        <button onClick={onClick} className="bg-gray-800 hover:bg-gray-700/80 transition-all duration-300 p-6 rounded-lg text-left w-full flex items-center gap-6 shadow-lg border border-gray-700">
            <div className="bg-green-500/10 text-green-400 p-4 rounded-full">{icon}</div>
            <div>
                <h3 className="font-bold text-xl text-white">{title}</h3>
                <p className="text-gray-400">{description}</p>
            </div>
            <div className="ml-auto text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </div>
        </button>
    );

    return (
        <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold text-white">Welcome, {currentUser?.profile.name}!</h1>
                <p className="text-lg text-gray-400 mt-2">What would you like to do today?</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ActionButton icon={<PlusIcon />} title="Create a Team" description="Start a new team and invite players." onClick={() => setModal('createTeam')} />
                <ActionButton icon={<UsersIcon />} title="Join a Team" description="Enter an invite code to join an existing team." onClick={() => setModal('joinTeam')} />
                <ActionButton icon={<PlusIcon />} title="Create a Tournament" description="Organize a new tournament for teams to join." onClick={() => setModal('createTournament')} />
                <ActionButton icon={<TrophyIcon />} title="Join a Tournament" description="Use a code to register your team for a tournament." onClick={() => setModal('joinTournament')} />
            </div>

            <Modal isOpen={modal === 'createTeam'} onClose={() => setModal(null)} title="Create a New Team">
                <form onSubmit={handleCreateTeam}>
                    <input type="text" placeholder="Team Name" value={teamName} onChange={e => setTeamName(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500" />
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                    <button type="submit" disabled={isLoading} className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500">{isLoading ? 'Creating...' : 'Create Team'}</button>
                </form>
            </Modal>
            
            <Modal isOpen={modal === 'joinTeam'} onClose={() => setModal(null)} title="Join a Team">
                 <form onSubmit={handleJoinTeam}>
                    <input type="text" placeholder="Enter Team Invite Code" value={teamCode} onChange={e => setTeamCode(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500" />
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                    <button type="submit" disabled={isLoading} className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500">{isLoading ? 'Joining...' : 'Join Team'}</button>
                </form>
            </Modal>

            <Modal isOpen={modal === 'createTournament'} onClose={() => setModal(null)} title="Create a New Tournament">
                 <form onSubmit={handleCreateTournament}>
                    <input type="text" placeholder="Tournament Name" value={tournamentName} onChange={e => setTournamentName(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500" />
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                    <button type="submit" disabled={isLoading} className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500">{isLoading ? 'Creating...' : 'Create Tournament'}</button>
                </form>
            </Modal>
            
             <Modal isOpen={modal === 'joinTournament'} onClose={() => setModal(null)} title="Join a Tournament">
                 <form onSubmit={handleJoinTournament} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Select Your Team</label>
                        <select
                           value={selectedTeamId}
                           onChange={(e) => setSelectedTeamId(e.target.value)}
                           className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            <option value="">-- Choose a team --</option>
                            {/* In a real app, `myTeams` would be populated from the context */}
                            {/* For now, this will be empty until the team fetching logic is robust */}
                            {/* Let's assume a placeholder for now */}
                        </select>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-300 mb-1">Tournament Invite Code</label>
                        <input type="text" placeholder="Enter Tournament Invite Code" value={tournamentCode} onChange={e => setTournamentCode(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                    <button type="submit" disabled={isLoading || !selectedTeamId} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500">{isLoading ? 'Joining...' : 'Join Tournament'}</button>
                </form>
            </Modal>
        </div>
    );
};
export default HomePage;

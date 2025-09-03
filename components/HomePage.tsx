import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { UsersIcon, TrophyIcon, PlusIcon } from './common/Icons';
import { Team } from '../types';

const fileToDataUri = (file: File, maxSize = 256): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            if (!readerEvent.target?.result) {
                return reject(new Error("Failed to read file."));
            }
            const image = new Image();
            image.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = image;

                if (width > height) {
                    if (width > maxSize) {
                        height = Math.round((height * maxSize) / width);
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = Math.round((width * maxSize) / height);
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.drawImage(image, 0, 0, width, height);
                // Use JPEG for compression, 85% quality is a good balance
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve(dataUrl);
            };
            image.onerror = reject;
            image.src = readerEvent.target.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

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
    const { currentUser, createTeam, joinTeam, createTournament, joinTournament, teams } = useAppContext();
    const navigate = useNavigate();
    const [modal, setModal] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // State for modals
    const [teamName, setTeamName] = useState('');
    const [teamLogo, setTeamLogo] = useState<File | null>(null);
    const [teamCode, setTeamCode] = useState('');
    const [tournamentName, setTournamentName] = useState('');
    const [tournamentLogo, setTournamentLogo] = useState<File | null>(null);
    const [tournamentCode, setTournamentCode] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState('');

    const myTeams = useMemo(() => {
        if (!currentUser || !teams) return [];
        return teams.filter(team =>
            team.adminIds.includes(currentUser._id) ||
            (team.members || []).some(member => (typeof member === 'string' ? member : member._id) === currentUser._id)
        );
    }, [currentUser, teams]);

    const resetTeamForm = () => {
        setTeamName('');
        setTeamLogo(null);
        setError('');
    }

    const resetTournamentForm = () => {
        setTournamentName('');
        setTournamentLogo(null);
        setError('');
    }


    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamName) return;
        setIsLoading(true);
        setError('');
        try {
            const logoUrl = teamLogo ? await fileToDataUri(teamLogo) : null;
            const newTeam = await createTeam(teamName, logoUrl);
            resetTeamForm();
            setModal(null);
            navigate(`/team/${newTeam._id}`);
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
            setTeamCode('');
            setModal(null);
            navigate(`/team/${joinedTeam._id}`);
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
            const logoUrl = tournamentLogo ? await fileToDataUri(tournamentLogo) : null;
            const newTournament = await createTournament(tournamentName, logoUrl);
            resetTournamentForm();
            setModal(null);
            navigate(`/tournament/${newTournament._id}`);
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
                setTournamentCode('');
                setSelectedTeamId('');
                setModal(null);
                navigate(`/tournament/${result.tournamentId}`);
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
                <form onSubmit={handleCreateTeam} className="space-y-4">
                    <input type="text" placeholder="Team Name" value={teamName} onChange={e => setTeamName(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500" required />
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Team Logo (Optional)</label>
                        <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setTeamLogo(e.target.files ? e.target.files[0] : null)}
                        className="mt-1 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                    <button type="submit" disabled={isLoading} className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500">{isLoading ? 'Creating...' : 'Create Team'}</button>
                </form>
            </Modal>
            
            <Modal isOpen={modal === 'joinTeam'} onClose={() => setModal(null)} title="Join a Team">
                 <form onSubmit={handleJoinTeam}>
                    <input type="text" placeholder="Enter Team Invite Code" value={teamCode} onChange={e => setTeamCode(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500" required />
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                    <button type="submit" disabled={isLoading} className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500">{isLoading ? 'Joining...' : 'Join Team'}</button>
                </form>
            </Modal>

            <Modal isOpen={modal === 'createTournament'} onClose={() => setModal(null)} title="Create a New Tournament">
                 <form onSubmit={handleCreateTournament} className="space-y-4">
                    <input type="text" placeholder="Tournament Name" value={tournamentName} onChange={e => setTournamentName(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500" required />
                     <div>
                        <label className="block text-sm font-medium text-gray-300">Tournament Logo (Optional)</label>
                        <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setTournamentLogo(e.target.files ? e.target.files[0] : null)}
                        className="mt-1 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
                        />
                    </div>
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
                           required
                        >
                            <option value="" disabled>-- Choose a team --</option>
                            {myTeams.map(team => (
                                <option key={team._id} value={team._id}>{team.name}</option>
                            ))}
                        </select>
                         {myTeams.length === 0 && <p className="text-xs text-gray-400 mt-1">You must be a member of a team to join a tournament.</p>}
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-300 mb-1">Tournament Invite Code</label>
                        <input type="text" placeholder="Enter Tournament Invite Code" value={tournamentCode} onChange={e => setTournamentCode(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500" required />
                    </div>
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                    <button type="submit" disabled={isLoading || !selectedTeamId} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500">{isLoading ? 'Joining...' : 'Join Tournament'}</button>
                </form>
            </Modal>
        </div>
    );
};
export default HomePage;

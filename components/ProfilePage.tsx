
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { PlayerPosition, PlayerProfile, MatchStatus, Team, User } from '../types';
import { TrophyIcon, StarIcon } from './common/Icons';

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

const ProfilePage: React.FC = () => {
  const { currentUser, updateProfile, teams, tournaments } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<PlayerProfile>>({ ...currentUser?.profile });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const stats = useMemo(() => {
    if (!currentUser) return { matchesPlayed: 0, goals: 0, assists: 0, potm: 0 };
    
    let matchesPlayed = 0;
    let goals = 0;
    let assists = 0;
    let potm = 0;

    tournaments.forEach(tournament => {
      tournament.matches.forEach(match => {
        const teamA = match.teamAId;
        const teamB = match.teamBId;
        const isPlayerInMatch = teamA.members.some(m => m._id === currentUser._id) || teamB.members.some(m => m._id === currentUser._id);
        
        if (isPlayerInMatch && match.status === MatchStatus.FINISHED) {
          matchesPlayed++;
        }
        
        match.goals.forEach(goal => {
          if (goal.scorerId._id === currentUser._id && !goal.isOwnGoal) {
            goals++;
          }
          if (goal.assistId?._id === currentUser._id) {
            assists++;
          }
        });

        if (match.playerOfTheMatchId?._id === currentUser._id) {
          potm++;
        }
      });
    });

    return { matchesPlayed, goals, assists, potm };
  }, [currentUser, tournaments]);

  useEffect(() => {
    if (currentUser) {
      setFormData({ ...currentUser.profile });
    }
  }, [currentUser, isEditing]);

  if (!currentUser) {
    return <div>Loading profile...</div>;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, imageUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    let updatedData = { ...formData };
    if (imageFile) {
        const imageUrl = await fileToDataUri(imageFile);
        updatedData.imageUrl = imageUrl;
    }
    if(typeof updatedData.age === 'string') {
        updatedData.age = parseInt(updatedData.age, 10);
    }
    await updateProfile(updatedData);
    setIsEditing(false);
    setImageFile(null);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({...prev, [name]: value}));
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Profile</h1>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Edit Profile</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(false) } className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
            <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Save Changes</button>
          </div>
        )}
      </div>
      
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="relative">
            {formData.imageUrl ? (
                <img src={formData.imageUrl} alt="Profile" className="w-40 h-40 rounded-full border-4 border-green-500 object-cover"/>
            ) : (
                 <div className="w-40 h-40 rounded-full border-4 border-green-500 bg-gray-700 flex items-center justify-center">
                    <span className="text-6xl font-bold text-gray-500">{formData.name?.charAt(0)}</span>
                </div>
            )}
            {isEditing && (
                 <div className="absolute bottom-0 right-0">
                    <label htmlFor="profile-pic-upload" className="bg-gray-900 p-2 rounded-full cursor-pointer hover:bg-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </label>
                    <input id="profile-pic-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
            )}
        </div>
        <div className="flex-grow space-y-4">
            <div>
              <label className="text-sm text-gray-400">Name</label>
              {isEditing ? (
                <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="w-full bg-gray-700 text-white p-2 rounded mt-1"/>
              ) : (
                <p className="text-xl font-semibold">{formData.name}</p>
              )}
            </div>
             <div>
              <label className="text-sm text-gray-400">Email</label>
              <p className="text-lg text-gray-300">{currentUser.email}</p>
            </div>
        </div>
      </div>

      <div className="mt-8 border-t border-gray-700 pt-6">
         <h2 className="text-2xl font-semibold mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="text-sm text-gray-400">Age</label>
                {isEditing ? ( <input type="number" name="age" value={formData.age || ''} onChange={handleChange} className="w-full bg-gray-700 text-white p-2 rounded mt-1"/> ) : ( <p className="text-lg">{formData.age || 'Not set'}</p> )}
            </div>
            <div>
                <label className="text-sm text-gray-400">Position</label>
                {isEditing ? ( <select name="position" value={formData.position || ''} onChange={handleChange} className="w-full bg-gray-700 text-white p-2 rounded mt-1"><option value="" disabled>Select position</option>{Object.values(PlayerPosition).map(pos => <option key={pos} value={pos}>{pos}</option>)}</select> ) : ( <p className="text-lg">{formData.position || 'Not set'}</p> )}
            </div>
            <div>
                <label className="text-sm text-gray-400">Year</label>
                {isEditing ? ( <select name="year" value={formData.year || ''} onChange={handleChange} className="w-full bg-gray-700 text-white p-2 rounded mt-1"><option value="">Select year</option><option value="1st">1st Year</option><option value="2nd">2nd Year</option><option value="3rd">3rd Year</option><option value="4th">4th Year</option></select> ) : ( <p className="text-lg">{formData.year || 'Not set'}</p> )}
            </div>
            <div>
                <label className="text-sm text-gray-400">Mobile Number</label>
                {isEditing ? ( <input type="tel" name="mobile" placeholder="e.g. 123-456-7890" value={formData.mobile || ''} onChange={handleChange} className="w-full bg-gray-700 text-white p-2 rounded mt-1"/> ) : ( <p className="text-lg">{formData.mobile || 'Not set'}</p> )}
            </div>
            <div className="md:col-span-2">
                <label className="text-sm text-gray-400">Unique Player ID</label>
                <p className="font-mono bg-gray-900 text-green-400 px-3 py-2 rounded mt-1 inline-block">{currentUser._id}</p>
            </div>
          </div>
      </div>
      
      <div className="mt-8 border-t border-gray-700 pt-6">
        <h2 className="text-2xl font-semibold mb-4">Career Statistics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-3xl font-bold text-green-400">{stats.matchesPlayed}</p>
                <p className="text-gray-400">Matches Played</p>
            </div>
             <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-3xl font-bold text-green-400">{stats.goals}</p>
                <p className="text-gray-400">Goals</p>
            </div>
             <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-3xl font-bold text-green-400">{stats.assists}</p>
                <p className="text-gray-400">Assists</p>
            </div>
             <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-3xl font-bold text-green-400">{stats.potm}</p>
                <p className="text-gray-400">Player of the Match</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

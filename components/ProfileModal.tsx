
import React, { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { PlayerPosition } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateProfile } = useAppContext();
  const [age, setAge] = useState<number | ''>('');
  const [position, setPosition] = useState<PlayerPosition | ''>('');
  const [image, setImage] = useState<File | null>(null);
  const [year, setYear] = useState('');
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!age || !position || !image) {
      setError('Age, position, and a profile picture are required.');
      return;
    }
    setIsLoading(true);
    
    try {
        const imageUrl = await fileToDataUri(image);
        await updateProfile({
          age: Number(age),
          position: position as PlayerPosition,
          imageUrl: imageUrl,
          year: year || undefined,
          mobile: mobile || undefined,
        });
        onClose();
    } catch (err: any) {
        setError(err.message || "Failed to update profile.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-white">Complete Your Profile</h2>
        <p className="text-gray-400 mb-6">Welcome, {currentUser?.profile.name}! Please provide a few more details to get started.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value === '' ? '' : parseInt(e.target.value))}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm text-white px-3 py-2"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Playing Position</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as PlayerPosition)}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm text-white px-3 py-2"
              required
              disabled={isLoading}
            >
              <option value="" disabled>Select position</option>
              {Object.values(PlayerPosition).map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Profile Picture</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)}
              className="mt-1 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Year (Optional)</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm text-white px-3 py-2"
              disabled={isLoading}
            >
              <option value="">Select year</option>
              <option value="1st">1st Year</option>
              <option value="2nd">2nd Year</option>
              <option value="3rd">3rd Year</option>
              <option value="4th">4th Year</option>
            </select>
          </div>
           <div>
            <label className="block text-sm font-medium text-gray-300">Mobile Number (Optional)</label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="e.g. 123-456-7890"
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm text-white px-3 py-2"
              disabled={isLoading}
            />
          </div>
           {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:bg-gray-500"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
         <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">Your unique Player ID is: <span className="font-mono bg-gray-700 text-green-400 px-2 py-1 rounded">{currentUser?._id}</span></p>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;

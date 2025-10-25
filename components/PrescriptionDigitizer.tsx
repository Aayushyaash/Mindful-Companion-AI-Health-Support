import React, { useState, useCallback } from 'react';
import { AppView } from '../types';
import { analyzeImage } from '../services/geminiService';
import { Upload, FileText, Loader, AlertTriangle, ArrowLeft, ScanText } from 'lucide-react';

interface PrescriptionDigitizerProps {
  setView: (view: AppView) => void;
}

const PrescriptionDigitizer: React.FC<PrescriptionDigitizerProps> = ({ setView }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
        if (selectedFile.size > 4 * 1024 * 1024) { // 4MB limit
            setError("File is too large. Please upload a file under 4MB.");
            return;
        }
      setFile(selectedFile);
      setError('');
      setResult('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };
  
  const handleSubmit = useCallback(async () => {
    if (!file || !preview) {
      setError('Please select an image or PDF file first.');
      return;
    }
    setIsLoading(true);
    setError('');
    setResult('');
    try {
        const base64Image = preview.split(',')[1];
        const prompt = `You are an expert medical data extractor. Your task is to analyze the provided medical document and extract only the most critical information.

Format the output using simple, clean HTML.
- Use <h3> for section titles (e.g., 'Patient Details').
- Use <ul> and <li> for lists of medications or other items.
- Use <strong> to highlight key terms like 'Name:' or medication names.
- Do not include <html>, <head>, or <body> tags. Do not use any CSS or <style> tags.

**Extraction Rules:**
1.  **Do not add any introductory text or preamble.** Directly start with the extracted HTML data.
2.  Extract the following sections if present:
    *   **Patient Details**: Include name, age, and gender.
    *   **Prescribing Doctor**: Include the doctor's name and clinic/hospital.
    *   **Diagnosis**: The primary diagnosis mentioned in the prescription.
    *   **Date of Prescription**: The date the prescription was issued.
    *   **Medications**: For each medication, create a list item with its name, dosage, and frequency/instructions.
    *   **Instructions**: Include any other special instructions for the patient.

3.  **Ignore all non-essential information**: This includes pharmacy logos, addresses, phone numbers, barcodes, etc.
4.  If the document does not appear to be a medical prescription, respond with only this exact text: 'This document does not appear to be a medical prescription.'`;
        const extractedText = await analyzeImage(base64Image, file.type, prompt);
        setResult(extractedText);
    } catch (err) {
      setError('An error occurred during analysis. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [file, preview]);

  return (
    <div className="max-w-4xl mx-auto">
       <button onClick={() => setView(AppView.Home)} className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Home
      </button>

      <div className="bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center mb-6">
            <ScanText className="h-12 w-12 mx-auto text-blue-500" />
            <h2 className="text-3xl font-bold text-gray-800 mt-2">Prescription Digitizer</h2>
            <p className="text-gray-500 mt-1">Upload a photo or PDF of your prescription to convert it to text.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
            <div>
                 <label htmlFor="file-upload" className="cursor-pointer block w-full p-6 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-blue-500 transition-colors min-h-[220px] flex justify-center items-center">
                    {preview && file?.type.startsWith('image/') ? (
                        <img src={preview} alt="Prescription preview" className="max-h-60 mx-auto rounded-md object-contain"/>
                    ) : file?.type === 'application/pdf' ? (
                        <div className="text-gray-500 flex flex-col items-center justify-center">
                            <FileText className="h-10 w-10 mx-auto mb-2 text-red-500"/>
                            <span className="font-semibold text-gray-700 max-w-full truncate px-4">{file.name}</span>
                        </div>
                    ) : (
                        <div className="text-gray-500">
                            <Upload className="h-10 w-10 mx-auto mb-2"/>
                            <span className="font-semibold text-blue-600">Click to upload</span>
                            <p className="text-sm">PNG, JPG, PDF up to 4MB</p>
                        </div>
                    )}
                 </label>
                <input id="file-upload" type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
                
                <button onClick={handleSubmit} disabled={isLoading || !file} className="mt-4 w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-all">
                    {isLoading ? <Loader className="animate-spin h-5 w-5 mr-2" /> : <FileText className="h-5 w-5 mr-2" />}
                    {isLoading ? 'Analyzing...' : 'Digitize Prescription'}
                </button>
                {error && <p className="text-red-500 mt-2 text-sm flex items-center"><AlertTriangle className="h-4 w-4 mr-1" /> {error}</p>}
            </div>

            <div className="bg-gray-50 p-6 rounded-lg min-h-[200px]">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Extracted Information</h3>
                 {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader className="animate-spin h-8 w-8 text-blue-500" />
                    </div>
                ) : (
                     <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: result || "<p>Analysis results will appear here.</p>" }}></div>
                )}
            </div>
        </div>
        <div className="text-center mt-8 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded-md text-sm">
             This tool is for convenience only. Always verify the extracted text with your original prescription and consult your doctor or pharmacist.
        </div>
      </div>
    </div>
  );
};

export default PrescriptionDigitizer;
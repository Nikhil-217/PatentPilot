from rdkit import Chem
from rdkit.Chem import AllChem
from rdkit.Chem import Draw
from rdkit.Chem.Draw import rdMolDraw2D
import numpy as np

class MoleculeError(Exception):
    pass

def canonicalize_smiles(smiles: str) -> str:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise MoleculeError("Invalid SMILES string")
    return Chem.MolToSmiles(mol)

def get_inchikey(smiles: str) -> str:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise MoleculeError("Invalid SMILES string")
    return Chem.MolToInchiKey(mol)

def get_morgan_fingerprint(smiles: str, radius: int = 2, n_bits: int = 2048) -> np.ndarray:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise MoleculeError("Invalid SMILES string")
    fp = AllChem.GetMorganFingerprintAsBitVect(mol, radius, nBits=n_bits)
    arr = np.zeros((0,), dtype=np.int8)
    Chem.DataStructs.ConvertToNumpyArray(fp, arr)
    return arr

def render_smiles_to_svg(smiles: str) -> str:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise MoleculeError("Invalid SMILES string")
    
    drawer = rdMolDraw2D.MolDraw2DSVG(400, 400)
    Draw.PrepareMolForDrawing(mol)
    drawer.DrawMolecule(mol)
    drawer.FinishDrawing()
    return drawer.GetDrawingText()

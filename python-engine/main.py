from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import scipy.stats as stats
import numpy as np
import math

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VariableDef(BaseModel):
    name: str  # ID used in data keys
    label: str # Human readable name
    type: str  # 'categorical', 'continuous', 'ordinal'

class AnalysisRequest(BaseModel):
    independent_vars: List[VariableDef]
    dependent_var: VariableDef
    data: List[Dict[str, Any]]

def clean_floats(obj):
    if isinstance(obj, float) and math.isnan(obj): return None
    if isinstance(obj, dict): return {k: clean_floats(v) for k, v in obj.items()}
    if isinstance(obj, list): return [clean_floats(v) for v in obj]
    return obj

@app.post("/api/analyze")
def analyze_data(request: AnalysisRequest):
    df = pd.DataFrame(request.data)
    
    # Safely convert data matching continuous to float
    for var in request.independent_vars + [request.dependent_var]:
        if var.type == 'continuous' and var.name in df.columns:
            df[var.name] = pd.to_numeric(df[var.name], errors='coerce')
    
    indep = request.independent_vars[0]
    dep = request.dependent_var
    
    if indep.name not in df.columns or dep.name not in df.columns:
        raise HTTPException(status_code=400, detail=f"Variable {indep.name} or {dep.name} not found in dataset")
        
    df = df.dropna(subset=[indep.name, dep.name])
    
    if len(df) == 0:
        raise HTTPException(status_code=400, detail="No valid data pairs left after dropping missing/invalid values.")

    results = {
        "test_used": "none",
        "p_value": None,
        "statistic": None,
        "indep_label": indep.label,
        "dep_label": dep.label,
        "n_samples": len(df),
        "descriptives": {},
        "chart_data": {}
    }
    
    # Descriptives
    if dep.type == 'continuous':
        results['descriptives']['dependent_overall'] = {
            "mean": float(df[dep.name].mean()),
            "median": float(df[dep.name].median()),
            "std": float(df[dep.name].std())
        }
    
    # Routing Math
    if indep.type == 'categorical' and dep.type == 'continuous':
        groups = {name: group[dep.name].values for name, group in df.groupby(indep.name)}
        group_arrays = list(groups.values())
        group_names = list(groups.keys())
        
        # Chart Data
        results['chart_data'] = {"type": "boxplot", "groups": group_names, "values": [list(g) for g in group_arrays]}
        
        if len(group_arrays) == 2:
            results['test_used'] = 'T-Test (Independent)'
            stat, p = stats.ttest_ind(group_arrays[0], group_arrays[1])
            results['statistic'] = float(stat)
            results['p_value'] = float(p)
            results['descriptives']['groups'] = {name: {"mean": float(g.mean()), "n": len(g)} for name, g in groups.items()}
        elif len(group_arrays) > 2:
            results['test_used'] = 'One-Way ANOVA'
            stat, p = stats.f_oneway(*group_arrays)
            results['statistic'] = float(stat)
            results['p_value'] = float(p)
            
    elif indep.type == 'continuous' and dep.type == 'categorical':
        # Analyze distribution of Continuous Independent (X) across groups of Categorical Dependent (Y)
        groups = {name: group[indep.name].values for name, group in df.groupby(dep.name)}
        group_arrays = list(groups.values())
        group_names = list(groups.keys())
        
        results['chart_data'] = {"type": "boxplot", "groups": group_names, "values": [list(g) for g in group_arrays]}
        
        if len(group_arrays) == 2:
            results['test_used'] = 'T-Test (Independent)'
            stat, p = stats.ttest_ind(group_arrays[0], group_arrays[1])
            results['statistic'] = float(stat)
            results['p_value'] = float(p)
            results['descriptives']['groups'] = {name: {"mean": float(g.mean()), "n": len(g)} for name, g in groups.items()}
        elif len(group_arrays) > 2:
            results['test_used'] = 'One-Way ANOVA'
            stat, p = stats.f_oneway(*group_arrays)
            results['statistic'] = float(stat)
            results['p_value'] = float(p)

    elif indep.type == 'categorical' and dep.type == 'categorical':
        results['test_used'] = 'Chi-Square'
        contingency = pd.crosstab(df[indep.name], df[dep.name])
        chi2, p, dof, ex = stats.chi2_contingency(contingency)
        results['statistic'] = float(chi2)
        results['p_value'] = float(p)
        results['descriptives']['contingency_table'] = contingency.to_dict()
        results['chart_data'] = {"type": "bar", "data": contingency.to_dict()}
        
    elif indep.type == 'continuous' and dep.type == 'continuous':
        results['test_used'] = 'Pearson Correlation'
        stat, p = stats.pearsonr(df[indep.name], df[dep.name])
        results['statistic'] = float(stat)
        results['p_value'] = float(p)
        # downsample scatter data if too large
        scatter_df = df.sample(min(100, len(df)))
        results['chart_data'] = {
            "type": "scatter", 
            "x": scatter_df[indep.name].tolist(), 
            "y": scatter_df[dep.name].tolist()
        }

    # Include anonymized data for the report appendix (limit to 100 rows)
    appendix_df = df[[indep.name, dep.name]].copy().rename(columns={indep.name: 'x_val', dep.name: 'y_val'})
    results['payload_data'] = appendix_df.head(100).to_dict(orient='records')

    return clean_floats(results)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

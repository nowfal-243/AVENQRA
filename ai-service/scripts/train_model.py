"""
AVENQRA PyTorch Fine-Tuning Script for Civic Issue Image Classification
Use on Google Colab or Local GPU environment.

Dataset Structure:
dataset/
  ├── train/
  │     ├── POTHOLE/
  │     ├── WASTE/
  │     ├── WATER_LEAK/
  │     ├── STREETLIGHT/
  │     └── ROAD_DAMAGE/
  └── val/
        ├── POTHOLE/
        ├── ...
"""

import os
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, models, transforms

CLASSES = ["POTHOLE", "WASTE", "WATER_LEAK", "STREETLIGHT", "ROAD_DAMAGE"]
BATCH_SIZE = 32
NUM_EPOCHS = 10
LEARNING_RATE = 0.001

def train_civic_vision_model(data_dir="./dataset", save_path="civic_mobilenet_v2.pth"):
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {device}")

    # Data augmentations
    data_transforms = {
        'train': transforms.Compose([
            transforms.RandomResizedCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
        'val': transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
    }

    if not os.path.exists(data_dir):
        print(f"Dataset directory '{data_dir}' not found. Please place dataset in '{data_dir}'")
        return

    image_datasets = {x: datasets.ImageFolder(os.path.join(data_dir, x), data_transforms[x]) for x in ['train', 'val']}
    dataloaders = {x: torch.utils.data.DataLoader(image_datasets[x], batch_size=BATCH_SIZE, shuffle=True, num_workers=4) for x in ['train', 'val']}

    # Load MobileNetV2 pre-trained model
    model = models.mobilenet_v2(pretrained=True)
    for param in model.parameters():
        param.requires_grad = False  # Freeze backbone

    # Replace classifier head
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, len(CLASSES))
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.classifier[1].parameters(), lr=LEARNING_RATE)

    best_acc = 0.0
    for epoch in range(NUM_EPOCHS):
        print(f"Epoch {epoch+1}/{NUM_EPOCHS}")
        for phase in ['train', 'val']:
            model.train() if phase == 'train' else model.eval()
            running_loss = 0.0
            running_corrects = 0

            for inputs, labels in dataloaders[phase]:
                inputs = inputs.to(device)
                labels = labels.to(device)
                optimizer.zero_grad()

                with torch.set_grad_enabled(phase == 'train'):
                    outputs = model(inputs)
                    _, preds = torch.max(outputs, 1)
                    loss = criterion(outputs, labels)
                    if phase == 'train':
                        loss.backward()
                        optimizer.step()

                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)

            epoch_loss = running_loss / len(image_datasets[phase])
            epoch_acc = running_corrects.double() / len(image_datasets[phase])
            print(f"{phase} Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}")

            if phase == 'val' and epoch_acc > best_acc:
                best_acc = epoch_acc
                torch.save(model.state_dict(), save_path)
                print(f"Model saved with accuracy: {best_acc:.4f}")

    print("Training Complete!")

if __name__ == "__main__":
    train_civic_vision_model()
